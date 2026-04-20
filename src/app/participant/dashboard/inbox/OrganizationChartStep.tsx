import React from 'react';
import { InboxActivityData, OrganizationChartItem } from './types';

interface OrganizationChartNode extends OrganizationChartItem {
  children: OrganizationChartNode[];
}

interface OrganizationChartStepProps {
  activityData?: InboxActivityData;
}

const OrganizationChartStep: React.FC<OrganizationChartStepProps> = ({ activityData }) => {
  const organizationCharts = activityData?.activityDetail?.organizationCharts || [];

  if (!activityData?.activityDetail || organizationCharts.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3 text-black">Organization Chart</h2>
        <div className="bg-white p-4 rounded border border-gray-200 text-gray-700">
          <p className="text-sm">No organization chart available for this activity.</p>
        </div>
      </div>
    );
  }

  // Build hierarchy from flat organization chart data
  const buildHierarchy = (items: OrganizationChartItem[]): OrganizationChartNode[] => {
    const itemMap = new Map<string, OrganizationChartNode>();
    const roots: OrganizationChartNode[] = [];

    // Create map of all items
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Build hierarchy
    items.forEach(item => {
      const node = itemMap.get(item.id);
      if (node && item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else if (node) {
        roots.push(node);
      }
    });

    return roots;
  };

  const hierarchy = buildHierarchy(organizationCharts);

  const renderNode = (node: OrganizationChartNode, level = 0): React.ReactElement => (
    <div key={node.id} className={`ml-${level * 6}`}>
      <div className="bg-gray-50 border border-gray-300 rounded p-3 mb-2 max-w-xs">
        <div className="font-semibold text-sm text-black">{node.name}</div>
        <div className="text-xs text-gray-700">{node.designation}</div>
        <div className="text-xs text-gray-600">{node.email}</div>
      </div>
      {node.children.map((child: OrganizationChartNode) => renderNode(child, level + 1))}
    </div>
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-black">Organization Chart</h2>
      <div className="bg-white p-4 rounded border border-gray-200 text-gray-800">
        <div className="space-y-3">
          {hierarchy.map(root => renderNode(root))}
        </div>
      </div>
    </div>
  );
};

export default OrganizationChartStep;