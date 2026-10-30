'use strict';

const agents = new Map();
const visitors = new Map();

function addAgent(tenantId, socketId, userId) {
  if (!agents.has(tenantId)) agents.set(tenantId, new Map());
  agents.get(tenantId).set(socketId, userId);
}
function removeAgent(tenantId, socketId) {
  const set = agents.get(tenantId);
  if (set) {
    set.delete(socketId);
    if (!set.size) agents.delete(tenantId);
  }
}
function onlineAgentCount(tenantId) {
  return agents.get(tenantId) ? agents.get(tenantId).size : 0;
}
function agentIds(tenantId) {
  return agents.get(tenantId) ? Array.from(new Set(agents.get(tenantId).values())) : [];
}

function addVisitor(siteId, socketId, visitorId) {
  if (!visitors.has(siteId)) visitors.set(siteId, new Map());
  visitors.get(siteId).set(socketId, visitorId);
}
function removeVisitor(siteId, socketId) {
  const set = visitors.get(siteId);
  if (set) {
    set.delete(socketId);
    if (!set.size) visitors.delete(siteId);
  }
}
function visitorCount(siteId) {
  return visitors.get(siteId) ? visitors.get(siteId).size : 0;
}

module.exports = { addAgent, removeAgent, onlineAgentCount, agentIds, addVisitor, removeVisitor, visitorCount };
