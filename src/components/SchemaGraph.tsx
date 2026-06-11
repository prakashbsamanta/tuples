import { useEffect, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, Handle, Position,
  useNodesState, useEdgesState, MarkerType,
  type NodeProps, type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { TableSchema } from '../lib/schema';
import { buildGraph } from '../lib/schemaGraph';

type TableNodeData = { table: TableSchema };
type TableNodeType = Node<TableNodeData>;

function TableNode({ data }: NodeProps<TableNodeType>) {
  const table = data.table;
  return (
    <div
      className={`rounded-xl overflow-hidden min-w-[170px] shadow-xl ${
        table.isView
          ? 'border border-amber-500/30 bg-amber-950/30'
          : 'border border-violet-500/30 bg-panel'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-violet-400" />
      <Handle type="source" position={Position.Right} className="!bg-violet-400" />
      <div className={`px-3 py-2 border-b flex items-center gap-2 ${
        table.isView ? 'border-amber-500/15 bg-amber-900/20' : 'border-violet-500/15 bg-violet-900/20'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${table.isView ? 'bg-amber-400' : 'bg-violet-400'}`} />
        <span className={`font-mono text-xs font-bold ${table.isView ? 'text-amber-200' : 'text-violet-200'}`}>
          {table.name}
        </span>
        {table.isView && (
          <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-auto">VIEW</span>
        )}
      </div>
      {table.columns.length > 0 && (
        <div className="p-2.5 space-y-1.5">
          {table.columns.map((col, ci) => (
            <div key={ci} className="flex items-center justify-between gap-3 font-mono text-[11px]">
              <div className="flex items-center gap-1.5">
                {col.pk && <span className="text-yellow-500 text-[9px]">🔑</span>}
                <span className={col.pk ? 'text-yellow-200 font-semibold' : 'text-gray-300'}>{col.name}</span>
              </div>
              <span className="text-gray-600 uppercase text-[9px]">{col.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { table: TableNode };

interface SchemaGraphProps {
  tables: TableSchema[];
}

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
};

export function SchemaGraph({ tables }: SchemaGraphProps) {
  const derived = useMemo(() => buildGraph(tables), [tables]);

  // Controlled state WITH change handlers so nodes are actually draggable.
  const [nodes, setNodes, onNodesChange] = useNodesState(derived.nodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derived.edges as unknown as Edge[]);

  // Re-sync the graph whenever the schema changes (e.g. a new table is created).
  useEffect(() => {
    setNodes(derived.nodes as unknown as Node[]);
    setEdges(derived.edges as unknown as Edge[]);
  }, [derived, setNodes, setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      proOptions={{ hideAttribution: true }}
      className="bg-transparent"
    >
      <Background color="#ffffff" gap={20} size={1} style={{ opacity: 0.04 }} />
      <Controls showInteractive={false} className="!bg-panel !border-white/10" />
    </ReactFlow>
  );
}
