import React from 'react';
import { GraphPageLayout } from '../components/GraphPageLayout';

export default function ProductionPage() {
  return <GraphPageLayout title="Production" color="#378ADD" fieldKey="actual" targetFieldKey="target"/>;
}