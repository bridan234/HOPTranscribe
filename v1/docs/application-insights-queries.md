# Application Insights KQL Queries

This document contains essential KQL queries for monitoring the HOPTranscribe application in Azure Application Insights.

## Table of Contents
1. [Overview & Health](#overview--health)
2. [Performance Monitoring](#performance-monitoring)
3. [Error & Exception Tracking](#error--exception-tracking)
4. [API Monitoring](#api-monitoring)
5. [Frontend Monitoring](#frontend-monitoring)
6. [User Analytics](#user-analytics)
7. [Dependency & External Calls](#dependency--external-calls)
8. [Cost & Usage Analytics](#cost--usage-analytics)
9. [WebSocket & Real-time Monitoring](#websocket--real-time-monitoring)
10. [Alerting Queries](#alerting-queries)

---

## Overview & Health

### Overall Application Health (Last 24 Hours)
```kusto
requests
| where timestamp > ago(24h)
| summarize 
    TotalRequests = count(),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2),
    AvgDuration = round(avg(duration), 2),
    P95Duration = round(percentile(duration, 95), 2),
    P99Duration = round(percentile(duration, 99), 2),
    ErrorCount = countif(success == false)
| project TotalRequests, SuccessRate, AvgDuration, P95Duration, P99Duration, ErrorCount
```

### Service Availability by Hour
```kusto
requests
| where timestamp > ago(24h)
| summarize 
    Requests = count(),
    Failures = countif(success == false),
    AvailabilityPercent = round(100.0 * countif(success == true) / count(), 2)
    by bin(timestamp, 1h)
| order by timestamp desc
```

### Current Sampling Rate
```kusto
requests
| where timestamp > ago(1h)
| summarize 
    TotalEvents = count(),
    SampledEvents = dcountif(operation_Id, itemCount > 1)
| extend SamplingRate = round(100.0 * SampledEvents / TotalEvents, 2)
```

---

## Performance Monitoring

### Slowest API Endpoints (Last 24 Hours)
```kusto
requests
| where timestamp > ago(24h)
| where success == true
| summarize 
    RequestCount = count(),
    AvgDuration = round(avg(duration), 2),
    P95Duration = round(percentile(duration, 95), 2),
    P99Duration = round(percentile(duration, 99), 2),
    MaxDuration = round(max(duration), 2)
    by name
| order by P95Duration desc
| take 20
```

### Request Performance Over Time
```kusto
requests
| where timestamp > ago(24h)
| summarize 
    AvgDuration = round(avg(duration), 2),
    P95Duration = round(percentile(duration, 95), 2),
    RequestCount = count()
    by bin(timestamp, 15m)
| render timechart
```

### Backend vs Frontend Performance Comparison
```kusto
requests
| where timestamp > ago(24h)
| extend Service = iff(cloud_RoleName contains "backend" or cloud_RoleName contains "api", "Backend", "Frontend")
| summarize 
    AvgDuration = round(avg(duration), 2),
    P95Duration = round(percentile(duration, 95), 2),
    RequestCount = count()
    by Service
```

### Response Time Distribution
```kusto
requests
| where timestamp > ago(24h)
| summarize count() by bin(duration, 100)
| order by duration asc
| render columnchart
```

---

## Error & Exception Tracking

### All Errors (Last 24 Hours)
```kusto
union exceptions, requests
| where timestamp > ago(24h)
| where success == false or isnotempty(problemId)
| project timestamp, type, name = coalesce(name, problemId), message, severityLevel, operation_Name, cloud_RoleName
| order by timestamp desc
| take 100
```

### Exception Summary with Counts
```kusto
exceptions
| where timestamp > ago(24h)
| summarize 
    Count = count(),
    AffectedUsers = dcount(user_Id),
    LastOccurrence = max(timestamp)
    by type, outerMessage
| order by Count desc
| take 50
```

### Failed Requests by Endpoint
```kusto
requests
| where timestamp > ago(24h)
| where success == false
| summarize 
    FailureCount = count(),
    FailureRate = round(100.0 * count() / toscalar(requests | where timestamp > ago(24h) | count()), 2)
    by name, resultCode
| order by FailureCount desc
```

### Error Rate Trending
```kusto
requests
| where timestamp > ago(24h)
| summarize 
    Total = count(),
    Errors = countif(success == false),
    ErrorRate = round(100.0 * countif(success == false) / count(), 2)
    by bin(timestamp, 15m)
| render timechart with (title="Error Rate Over Time")
```

### Top Exception Types
```kusto
exceptions
| where timestamp > ago(7d)
| summarize 
    Count = count(),
    UniqueOperations = dcount(operation_Name)
    by type
| order by Count desc
| take 20
```

---

## API Monitoring

### API Endpoint Usage Statistics
```kusto
requests
| where timestamp > ago(24h)
| where url contains "api"
| summarize 
    CallCount = count(),
    AvgDuration = round(avg(duration), 2),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2)
    by name
| order by CallCount desc
```

### WebSocket Connection Health
```kusto
requests
| where timestamp > ago(24h)
| where name contains "websocket" or name contains "ws"
| summarize 
    Connections = count(),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2),
    AvgDuration = round(avg(duration), 2)
    by bin(timestamp, 1h)
| render timechart
```

### API Response Codes Distribution
```kusto
requests
| where timestamp > ago(24h)
| summarize Count = count() by resultCode
| order by Count desc
| render piechart
```

### Transcription API Performance
```kusto
requests
| where timestamp > ago(24h)
| where name contains "transcribe" or operation_Name contains "transcribe"
| summarize 
    Count = count(),
    AvgDuration = round(avg(duration), 2),
    P95Duration = round(percentile(duration, 95), 2),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2)
    by bin(timestamp, 30m)
| render timechart
```

### CORS-Related Errors
```kusto
requests
| where timestamp > ago(24h)
| where resultCode == 403 or resultCode == 405
| project timestamp, name, url, resultCode, client_IP, client_Browser
| order by timestamp desc
| take 50
```

---

## Frontend Monitoring

### Page Views and User Sessions
```kusto
pageViews
| where timestamp > ago(24h)
| summarize 
    PageViews = count(),
    UniqueSessions = dcount(session_Id),
    UniqueUsers = dcount(user_Id)
    by bin(timestamp, 1h)
| render timechart
```

### Browser Distribution
```kusto
pageViews
| where timestamp > ago(7d)
| summarize Count = count() by client_Browser
| order by Count desc
| render piechart
```

### Page Load Performance
```kusto
pageViews
| where timestamp > ago(24h)
| summarize 
    AvgLoadTime = round(avg(duration), 2),
    P95LoadTime = round(percentile(duration, 95), 2),
    ViewCount = count()
    by name
| order by ViewCount desc
```

### Client-Side Exceptions
```kusto
exceptions
| where timestamp > ago(24h)
| where client_Type == "Browser"
| summarize 
    Count = count(),
    AffectedUsers = dcount(user_Id)
    by outerMessage, client_Browser
| order by Count desc
| take 20
```

### Custom Events (User Actions)
```kusto
customEvents
| where timestamp > ago(24h)
| summarize Count = count() by name
| order by Count desc
| render columnchart
```

---

## User Analytics

### Active Users by Location
```kusto
requests
| where timestamp > ago(24h)
| extend city = tostring(client_City), country = tostring(client_CountryOrRegion)
| where isnotempty(city) and isnotempty(country)
| summarize 
    UniqueUsers = dcount(user_Id),
    TotalRequests = count()
    by city, country
| order by UniqueUsers desc
| take 50
```

### User Activity Heatmap (by Hour)
```kusto
requests
| where timestamp > ago(7d)
| extend Hour = hourofday(timestamp), DayOfWeek = dayofweek(timestamp)
| summarize RequestCount = count() by Hour, DayOfWeek
| render heatmap
```

### Session Duration Analysis
```kusto
pageViews
| where timestamp > ago(24h)
| summarize 
    SessionStart = min(timestamp),
    SessionEnd = max(timestamp),
    PageCount = count()
    by session_Id
| extend SessionDuration = datetime_diff('minute', SessionEnd, SessionStart)
| where SessionDuration > 0
| summarize 
    AvgDuration = round(avg(SessionDuration), 2),
    MedianDuration = round(percentile(SessionDuration, 50), 2),
    TotalSessions = count()
```

### New vs Returning Users
```kusto
pageViews
| where timestamp > ago(7d)
| summarize FirstSeen = min(timestamp) by user_Id
| extend IsNewUser = iff(FirstSeen > ago(1d), "New", "Returning")
| summarize Count = count() by IsNewUser
| render piechart
```

### Device Type Distribution
```kusto
requests
| where timestamp > ago(7d)
| summarize Count = count() by client_OS, client_Type
| order by Count desc
| take 20
```

---

## Dependency & External Calls

### OpenAI API Performance
```kusto
dependencies
| where timestamp > ago(24h)
| where target contains "openai" or name contains "openai"
| summarize 
    CallCount = count(),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2),
    AvgDuration = round(avg(duration), 2),
    P95Duration = round(percentile(duration, 95), 2)
    by bin(timestamp, 30m)
| render timechart
```

### All External Dependencies
```kusto
dependencies
| where timestamp > ago(24h)
| summarize 
    CallCount = count(),
    SuccessRate = round(100.0 * countif(success == true) / count(), 2),
    AvgDuration = round(avg(duration), 2)
    by target, type
| order by CallCount desc
```

### Dependency Failures
```kusto
dependencies
| where timestamp > ago(24h)
| where success == false
| project timestamp, name, target, type, resultCode, duration, data
| order by timestamp desc
| take 100
```

### Slow External Calls
```kusto
dependencies
| where timestamp > ago(24h)
| where duration > 5000  // Slower than 5 seconds
| project timestamp, name, target, duration, success, resultCode
| order by duration desc
| take 50
```

---

## Cost & Usage Analytics

### Request Volume by Service
```kusto
requests
| where timestamp > ago(24h)
| extend Service = case(
    cloud_RoleName contains "frontend", "Frontend",
    cloud_RoleName contains "backend" or cloud_RoleName contains "api", "Backend",
    "Unknown"
)
| summarize RequestCount = count() by Service, bin(timestamp, 1h)
| render timechart
```

### Data Ingestion Volume (for cost estimation)
```kusto
union requests, exceptions, traces, dependencies, pageViews, customEvents
| where timestamp > ago(30d)
| summarize 
    TotalEvents = count(),
    EstimatedSizeGB = round(sum(itemCount) * 0.001 / 1024, 2)  // Rough estimate
    by bin(timestamp, 1d)
| render timechart
```

### Sampling Impact Analysis
```kusto
requests
| where timestamp > ago(24h)
| extend IsSampled = itemCount > 1
| summarize 
    SampledRequests = countif(IsSampled),
    TotalRequests = count(),
    SamplingPercentage = round(100.0 * countif(IsSampled) / count(), 2)
| project SamplingPercentage, SampledRequests, TotalRequests
```

### Most Frequent Operations (for optimization)
```kusto
requests
| where timestamp > ago(7d)
| summarize 
    CallCount = count(),
    TotalDuration = sum(duration)
    by operation_Name
| extend TotalMinutes = round(TotalDuration / 60000, 2)
| order by CallCount desc
| take 30
```

---

## WebSocket & Real-time Monitoring

### WebSocket Connection Success Rate
```kusto
customEvents
| where timestamp > ago(24h)
| where name contains "websocket" or name == "connection_state_changed"
| extend ConnectionState = tostring(customDimensions.state)
| summarize Count = count() by ConnectionState
| render piechart
```

### Real-time Transcription Events
```kusto
customEvents
| where timestamp > ago(1h)
| where name in ("transcription_started", "transcription_completed", "scripture_detected")
| summarize Count = count() by name, bin(timestamp, 5m)
| render timechart
```

### OpenAI Realtime API Latency
```kusto
dependencies
| where timestamp > ago(24h)
| where target contains "openai.com" and name contains "realtime"
| summarize 
    AvgLatency = round(avg(duration), 2),
    P95Latency = round(percentile(duration, 95), 2),
    MaxLatency = round(max(duration), 2)
    by bin(timestamp, 15m)
| render timechart
```

### Audio Streaming Health
```kusto
traces
| where timestamp > ago(1h)
| where message contains "audio" or message contains "stream"
| project timestamp, severityLevel, message, operation_Name
| order by timestamp desc
| take 100
```

---

## Alerting Queries

### High Error Rate (>5% in last 15 minutes)
```kusto
requests
| where timestamp > ago(15m)
| summarize 
    Total = count(),
    Failures = countif(success == false),
    ErrorRate = round(100.0 * countif(success == false) / count(), 2)
| where ErrorRate > 5
| project ErrorRate, Total, Failures
```

### Slow Response Times (P95 > 3 seconds)
```kusto
requests
| where timestamp > ago(15m)
| summarize P95Duration = percentile(duration, 95)
| where P95Duration > 3000
| project P95Duration
```

### Service Availability Drop (<95%)
```kusto
requests
| where timestamp > ago(15m)
| summarize 
    SuccessRate = round(100.0 * countif(success == true) / count(), 2)
| where SuccessRate < 95
| project SuccessRate
```

### Dependency Failure Spike
```kusto
dependencies
| where timestamp > ago(15m)
| where success == false
| summarize FailureCount = count() by target
| where FailureCount > 10
| order by FailureCount desc
```

### Exception Surge (>50 exceptions in 15 min)
```kusto
exceptions
| where timestamp > ago(15m)
| summarize ExceptionCount = count()
| where ExceptionCount > 50
| project ExceptionCount
```

### Memory or Resource Exhaustion
```kusto
traces
| where timestamp > ago(15m)
| where severityLevel >= 3  // Warning or Error
| where message contains "memory" or message contains "OutOfMemory"
| summarize Count = count()
| where Count > 0
```

---

## Advanced Analytics

### User Journey Analysis
```kusto
pageViews
| where timestamp > ago(24h)
| where isnotempty(session_Id)
| project timestamp, session_Id, name, duration
| order by session_Id, timestamp asc
| summarize Journey = make_list(name) by session_Id
| take 50
```

### Conversion Funnel (Settings → Recording → Scripture Detection)
```kusto
customEvents
| where timestamp > ago(24h)
| where name in ("settings_opened", "recording_started", "scripture_detected")
| summarize Count = count() by name
| order by Count desc
```

### Performance Regression Detection
```kusto
let baseline = requests
    | where timestamp between (ago(7d) .. ago(1d))
    | summarize BaselineP95 = percentile(duration, 95);
let current = requests
    | where timestamp > ago(1d)
    | summarize CurrentP95 = percentile(duration, 95);
current
| extend Baseline = toscalar(baseline)
| extend RegressionPercent = round(100.0 * (CurrentP95 - Baseline) / Baseline, 2)
| project CurrentP95, Baseline, RegressionPercent
```

### Language Usage Statistics
```kusto
customEvents
| where timestamp > ago(7d)
| where name == "language_changed"
| extend Language = tostring(customDimensions.language)
| summarize UsageCount = count() by Language
| order by UsageCount desc
| render columnchart
```

### Bible Version Popularity
```kusto
customEvents
| where timestamp > ago(7d)
| where name == "bible_version_changed"
| extend Version = tostring(customDimensions.version)
| summarize UsageCount = count() by Version
| order by UsageCount desc
| render columnchart
```

---

## Usage Tips

1. **Time Ranges**: Adjust time ranges using operators like:
   - `ago(1h)` - Last 1 hour
   - `ago(24h)` - Last 24 hours
   - `ago(7d)` - Last 7 days
   - `between(datetime("2025-01-01") .. datetime("2025-01-31"))` - Specific range

2. **Export Results**: Use `| take 1000` to limit results, then export to CSV or Excel

3. **Create Dashboards**: Pin important queries to Azure Dashboard for quick access

4. **Set Alerts**: Convert alerting queries into Azure Monitor alerts for proactive monitoring

5. **Custom Dimensions**: Access custom properties with `tostring(customDimensions.propertyName)`

6. **Joins**: Combine data sources for deeper insights:
   ```kusto
   requests
   | join kind=inner (exceptions) on operation_Id
   ```

7. **Visualization**: Add `| render` to create charts:
   - `timechart` - Time series
   - `barchart` - Bar chart
   - `piechart` - Pie chart
   - `columnchart` - Column chart
   - `heatmap` - Heatmap

---

## Quick Reference: Common Filters

```kusto
// Filter by service
| where cloud_RoleName == "hoptranscribe-backend"

// Filter by success/failure
| where success == true
| where success == false

// Filter by HTTP status
| where resultCode == 200
| where resultCode >= 400

// Filter by duration
| where duration > 1000  // Slower than 1 second

// Filter by user
| where user_Id == "specific-user-id"

// Filter by custom dimension
| where tostring(customDimensions.language) == "Spanish"
```

---

**Last Updated**: October 28, 2025  
**Application**: HOPTranscribe - Sermon & Reference Assistant  
**Environment**: Production (Azure Container Apps)
