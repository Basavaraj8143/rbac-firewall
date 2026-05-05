import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Network } from 'lucide-react';

const LEVEL_COLORS = {
  1: '#9fc9a2',
  2: '#9fbbe0',
  3: '#c0a8dd',
  4: '#dfa88f',
  5: '#c08532',
};

export default function RoleGraph({ nodes = [], links = [] }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!nodes.length || !svgRef.current) {
      return;
    }

    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 400;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const defs = svg.append('defs');

    defs.append('marker')
      .attr('id', 'role-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 26)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#cfcdc4');

    const simNodes = nodes.map((node) => ({ ...node }));
    const simLinks = links.map((link) => ({ ...link }));

    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id((node) => node.id).distance(118))
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(48));

    const link = svg.append('g')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', '#cfcdc4')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#role-arrow)');

    const node = svg.append('g')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .call(
        d3.drag()
          .on('start', (event, item) => {
            if (!event.active) {
              simulation.alphaTarget(0.3).restart();
            }
            item.fx = item.x;
            item.fy = item.y;
          })
          .on('drag', (event, item) => {
            item.fx = event.x;
            item.fy = event.y;
          })
          .on('end', (event, item) => {
            if (!event.active) {
              simulation.alphaTarget(0);
            }
            item.fx = null;
            item.fy = null;
          })
      );

    node.append('circle')
      .attr('r', 26)
      .attr('fill', '#fafaf7')
      .attr('stroke', (item) => LEVEL_COLORS[item.level] || '#f54e00')
      .attr('stroke-width', 2);

    node.append('text')
      .text((item) => item.name)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#26251e')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('font-family', 'Inter, system-ui, sans-serif');

    node.append('text')
      .text((item) => `L${item.level}`)
      .attr('text-anchor', 'middle')
      .attr('y', 38)
      .attr('fill', '#807d72')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace');

    node.append('title')
      .text((item) => `${item.name}\nPermissions: ${(item.permissions || []).join(', ')}`);

    simulation.on('tick', () => {
      link
        .attr('x1', (item) => item.source.x)
        .attr('y1', (item) => item.source.y)
        .attr('x2', (item) => item.target.x)
        .attr('y2', (item) => item.target.y);

      node.attr('transform', (item) => `translate(${item.x},${item.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  if (!nodes.length) {
    return (
      <div className="empty-state">
        <Network size={34} />
        <div>Select a tenant to visualize role hierarchy.</div>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '400px', background: 'var(--canvas-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)' }}
    />
  );
}
