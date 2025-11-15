#!/bin/bash
#########################################################################
# Elasticsearch Alerts Query Test
# Tests if we can manually retrieve alerts that should appear on dashboard
#########################################################################

echo "=========================================="
echo "  ELASTICSEARCH ALERTS QUERY TEST"
echo "=========================================="
echo ""

echo "[1] Cluster Health:"
curl -s localhost:9200/_cluster/health?pretty | grep -E "cluster_name|status|number_of"

echo ""
echo "[2] Filebeat Indices:"
curl -s "localhost:9200/_cat/indices/filebeat-*?v&s=index"

echo ""
echo "[3] Total Document Count:"
curl -s "localhost:9200/filebeat-*/_count?pretty"

echo ""
echo "[4] Recent Suricata Alerts (Last 5):"
curl -s "localhost:9200/filebeat-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 5,
  "sort": [{"timestamp": {"order": "desc", "unmapped_type": "date"}}],
  "query": {
    "bool": {
      "must": [
        {"exists": {"field": "event_type"}},
        {"term": {"event_type": "alert"}}
      ]
    }
  },
  "_source": ["timestamp", "src_ip", "dest_ip", "alert", "event_type", "proto"]
}
' | jq '.hits.hits[]._source' 2>/dev/null || curl -s "localhost:9200/filebeat-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 5,
  "sort": [{"timestamp": {"order": "desc", "unmapped_type": "date"}}],
  "query": {
    "bool": {
      "must": [
        {"exists": {"field": "event_type"}},
        {"term": {"event_type": "alert"}}
      ]
    }
  },
  "_source": ["timestamp", "src_ip", "dest_ip", "alert", "event_type", "proto"]
}'

echo ""
echo ""
echo "[5] Sample of ANY recent events (to see structure):"
curl -s "localhost:9200/filebeat-*/_search?size=2" -H 'Content-Type: application/json' -d'
{
  "sort": [{"timestamp": {"order": "desc", "unmapped_type": "date"}}]
}
' | jq '.hits.hits[]._source | {timestamp: .timestamp, event_type: .event_type, src_ip: .src_ip, dest_ip: .dest_ip}' 2>/dev/null || echo "jq not installed, showing raw..."

echo ""
echo ""
echo "[6] Checking for alerts with specific query patterns:"
echo ""
echo "    [A] Events with 'alert' in event_type:"
curl -s "localhost:9200/filebeat-*/_search?size=0" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {"event_type": "alert"}
  }
}
' | grep -o '"count":[0-9]*'

echo ""
echo "    [B] Events from Suricata:"
curl -s "localhost:9200/filebeat-*/_search?size=0" -H 'Content-Type: application/json' -d'
{
  "query": {
    "exists": {"field": "alert.signature"}
  }
}
' | grep -o '"count":[0-9]*'

echo ""
echo "    [C] All events (total):"
curl -s "localhost:9200/filebeat-*/_count" | grep -o '"count":[0-9]*'

echo ""
echo ""
echo "[7] Checking field mappings for alert data:"
curl -s "localhost:9200/filebeat-*/_mapping?pretty" | grep -A 5 "alert\|event_type" | head -30

echo ""
echo "=========================================="
echo "  QUERY TEST COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "- If you see alerts above, data exists in Elasticsearch ✓"
echo "- If counts are 0, need to check Suricata → Filebeat pipeline"
echo "- The API should query Elasticsearch similarly"
echo ""
