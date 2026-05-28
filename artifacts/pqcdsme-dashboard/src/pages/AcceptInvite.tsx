// src/pages/AcceptInvitePage.tsx
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "../lib/supabase";

type Status = "idle" | "loading" | "success" | "error";

export function AcceptInvitePage() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus]     = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [tokenReady, setTokenReady]     = useState(false);
  const [invitedUserId, setInvitedUserId] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError]   = useState("");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const tokenHash = params.get("token_hash");
    const type      = params.get("type");

    if (tokenHash && type === "invite") {
        supabase.auth.signOut({ scope: "local" }).then(() => {
        supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" })
            .then(({ data, error }) => {
            if (error || !data.session) {
                setErrorMsg("Invite link is invalid or has expired. Please ask your admin to resend.");
                setTokenReady(true);
                return;
            }
            setInvitedUserId(data.session.user.id);
            window.history.replaceState(null, "", window.location.pathname);
            setTokenReady(true);
            });
        });
    } else {
        setErrorMsg("Invalid invite link. Please ask your admin to send a new invite.");
        setTokenReady(true);
    }
    }, []);

  function handlePasswordChange(val: string) {
    setPassword(val);
    if (val.length > 0 && val.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
    } else {
      setPasswordError("");
    }
  }

  function handleConfirmChange(val: string) {
    setConfirm(val);
    if (val.length > 0 && val !== password) {
      setConfirmError("Passwords do not match.");
    } else {
      setConfirmError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    

    setStatus("loading");

    // Set password + name on auth user
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName.trim() },
    });

    if (updateError) {
      setErrorMsg(updateError.message);
      setStatus("error");
      return;
    }

    // Update profile row
    if (invitedUserId) {
      await supabase
        .from("user_profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", invitedUserId);
    }

    setStatus("success");
    // Small delay so they see the success message, then redirect
    setTimeout(async () => {
    await supabase.auth.signOut({ scope: "local" });
    });
  }

  // Still parsing the hash
  if (!tokenReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Verifying invite link…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">

        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Set your password</h1>
          <p className="text-sm text-gray-400 mt-1">
            You've been invited to PQCDSME Dashboard. Fill in your details to get started.
          </p>
        </div>

        {status === "success" ? (
          <div className="text-center space-y-2">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-medium text-gray-800">Account created successfully!</p>
            <p className="text-sm text-gray-500">
              Your account is ready. Please log in to access the dashboard.
            </p>
            
              <a href="/login"
              className="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
              >
              Go to Login
              </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Show error if link is invalid, but still render form fields hidden */}
            {errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            {/* Only show form if no hard error (invalid link) */}
            {!errorMsg && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => handlePasswordChange(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      passwordError ? "border-red-300 focus:ring-red-400" : "border-gray-200"
                    }`}
                  />
                  {passwordError && (
                    <p className="text-xs text-red-500 mt-1">{passwordError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => handleConfirmChange(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      confirmError ? "border-red-300 focus:ring-red-400" : "border-gray-200"
                    }`}
                  />
                  {confirmError && (
                    <p className="text-xs text-red-500 mt-1">{confirmError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    status === "loading" ||
                    !fullName.trim() ||
                    password.length < 8 ||
                    password !== confirm
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {status === "loading" ? "Setting up account…" : "Set password & continue"}
                </button>
              </>
            )}

          </form>
        )}
      </div>
    </div>
  );
}