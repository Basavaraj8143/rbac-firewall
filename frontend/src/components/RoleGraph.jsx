/**
 * RoleGraph.jsx — D3.js Force-Directed Role Hierarchy Visualization
 *
 * Renders role nodes as circles with directed edges showing inheritance.
 * Escalation paths are highlighted in red.
 */
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Network } from 'lucide-react';

const LEVEL_COLORS = {
  1: '#10b981', // Employee → green
  2: '#f59e0b', // Manager  → amber
  3: '#ef4444', // Admin    → red
};

export default function RoleGraph({ nodes = [], links = [] }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!nodes.length) return;

    const width  = svgRef.current.clientWidth  || 600;
    const height = svgRef.current.clientHeight || 400;

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Arrow marker definitions
    const defs = svg.append('defs');

    ['#8892a4', '#ef4444'].forEach((color, i) => {
      defs.append('marker')
        .attr('id', `arrow-${i}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Deep-copy nodes/links for D3 mutation
    const simNodes = nodes.map(n => ({ ...n }));
    const simLinks = links.map(l => ({ ...l }));

    const simulation = d3.forceSimulation(simNodes)
      .force('link',   d3.forceLink(simLinks).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(50));

    // Links
    const link = svg.append('g').attr('class', 'links')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', '#ef4444')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow-1)');

    // Node groups
    const node = svg.append('g').attr('class', 'nodes')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    // Circle
    node.append('circle')
      .attr('r', 28)
      .attr('fill', d => `${LEVEL_COLORS[d.level] || '#3b82f6'}22`)
      .attr('stroke', d => LEVEL_COLORS[d.level] || '#3b82f6')
      .attr('stroke-width', 2);

    // Role name label
    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => LEVEL_COLORS[d.level] || '#3b82f6')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('font-family', 'Inter, sans-serif');

    // Level badge (below circle)
    node.append('text')
      .text(d => `L${d.level}`)
      .attr('text-anchor', 'middle')
      .attr('y', 40)
      .attr('fill', '#4a5568')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace');

    // Tooltip: permissions on hover
    node.append('title')
      .text(d => `${d.name}\nPermissions: ${(d.permissions || []).join(', ')}`);

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [nodes, links]);

  if (!nodes.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Network size={40} /></div>
        <div>Select a tenant to visualize its role hierarchy</div>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '400px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}
    />
  );
}
