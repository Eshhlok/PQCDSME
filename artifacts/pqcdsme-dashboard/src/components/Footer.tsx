import React from "react";

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-gray-50 py-4 mt-auto min-h-[72px]">
      <div className="flex flex-col items-center gap-1 text-sm text-gray-500">
        <p>Built with love for manufacturing excellence.</p>
        <p>
          A project by <span className="font-semibold text-gray-700">Eshlok Agarwal</span>
          {" • "}
          <a
            href="https://www.linkedin.com/in/eshlok-agarwal-134877380/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-orange-500 hover:text-orange-600 transition-colors"
          >
            LinkedIn
          </a>
          {" • "}
          {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}