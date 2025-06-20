"""Metrics collection and monitoring."""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import threading
from collections import defaultdict, deque
import json


class MetricsCollector:
    """Collects and manages application metrics."""
    
    def __init__(self, max_history_size: int = 10000):
        self.max_history_size = max_history_size
        self._lock = threading.Lock()
        
        # Counters
        self._counters: Dict[str, int] = defaultdict(int)
        
        # Gauges (current values)
        self._gauges: Dict[str, float] = {}
        
        # Histograms (value distributions)
        self._histograms: Dict[str, List[float]] = defaultdict(list)
        
        # Time series data
        self._time_series: Dict[str, deque] = defaultdict(lambda: deque(maxlen=self.max_history_size))
        
        # Custom metrics
        self._custom_metrics: Dict[str, Any] = {}
    
    def increment_counter(self, name: str, value: int = 1, tags: Optional[Dict[str, str]] = None):
        """Increment a counter metric."""
        with self._lock:
            metric_key = self._build_metric_key(name, tags)
            self._counters[metric_key] += value
            
            # Record time series
            self._time_series[f"{metric_key}_timeseries"].append({
                "timestamp": datetime.now().isoformat(),
                "value": self._counters[metric_key],
                "increment": value
            })
    
    def set_gauge(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Set a gauge metric value."""
        with self._lock:
            metric_key = self._build_metric_key(name, tags)
            self._gauges[metric_key] = value
            
            # Record time series
            self._time_series[f"{metric_key}_timeseries"].append({
                "timestamp": datetime.now().isoformat(),
                "value": value
            })
    
    def record_histogram(self, name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Record a value in a histogram."""
        with self._lock:
            metric_key = self._build_metric_key(name, tags)
            self._histograms[metric_key].append(value)
            
            # Keep histogram size manageable
            if len(self._histograms[metric_key]) > 1000:
                self._histograms[metric_key] = self._histograms[metric_key][-500:]
            
            # Record time series
            self._time_series[f"{metric_key}_timeseries"].append({
                "timestamp": datetime.now().isoformat(),
                "value": value
            })
    
    def record_timing(self, name: str, start_time: datetime, tags: Optional[Dict[str, str]] = None):
        """Record timing metric from start time to now."""
        duration = (datetime.now() - start_time).total_seconds()
        self.record_histogram(f"{name}_duration", duration, tags)
    
    def set_custom_metric(self, name: str, value: Any, tags: Optional[Dict[str, str]] = None):
        """Set a custom metric value."""
        with self._lock:
            metric_key = self._build_metric_key(name, tags)
            self._custom_metrics[metric_key] = {
                "value": value,
                "timestamp": datetime.now().isoformat()
            }
    
    def get_counter(self, name: str, tags: Optional[Dict[str, str]] = None) -> int:
        """Get counter value."""
        metric_key = self._build_metric_key(name, tags)
        return self._counters.get(metric_key, 0)
    
    def get_gauge(self, name: str, tags: Optional[Dict[str, str]] = None) -> Optional[float]:
        """Get gauge value."""
        metric_key = self._build_metric_key(name, tags)
        return self._gauges.get(metric_key)
    
    def get_histogram_stats(self, name: str, tags: Optional[Dict[str, str]] = None) -> Dict[str, float]:
        """Get histogram statistics."""
        metric_key = self._build_metric_key(name, tags)
        values = self._histograms.get(metric_key, [])
        
        if not values:
            return {}
        
        sorted_values = sorted(values)
        count = len(sorted_values)
        
        return {
            "count": count,
            "min": min(sorted_values),
            "max": max(sorted_values),
            "mean": sum(sorted_values) / count,
            "median": sorted_values[count // 2],
            "p95": sorted_values[int(count * 0.95)] if count > 0 else 0,
            "p99": sorted_values[int(count * 0.99)] if count > 0 else 0
        }
    
    def get_time_series(self, name: str, tags: Optional[Dict[str, str]] = None, 
                       minutes: int = 60) -> List[Dict[str, Any]]:
        """Get time series data for the last N minutes."""
        metric_key = self._build_metric_key(name, tags)
        timeseries_key = f"{metric_key}_timeseries"
        
        if timeseries_key not in self._time_series:
            return []
        
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        recent_data = []
        
        for entry in self._time_series[timeseries_key]:
            entry_time = datetime.fromisoformat(entry["timestamp"])
            if entry_time >= cutoff_time:
                recent_data.append(entry)
        
        return recent_data
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all current metrics."""
        with self._lock:
            return {
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "histograms": {
                    name: self.get_histogram_stats(name.split("__")[0])
                    for name in self._histograms.keys()
                },
                "custom_metrics": dict(self._custom_metrics),
                "timestamp": datetime.now().isoformat()
            }
    
    def reset_metrics(self):
        """Reset all metrics."""
        with self._lock:
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()
            self._time_series.clear()
            self._custom_metrics.clear()
    
    def _build_metric_key(self, name: str, tags: Optional[Dict[str, str]]) -> str:
        """Build a metric key with tags."""
        if not tags:
            return name
        
        tag_string = "__".join(f"{k}={v}" for k, v in sorted(tags.items()))
        return f"{name}__{tag_string}"


# Global metrics collector instance
metrics = MetricsCollector()


def timing_metric(metric_name: str, tags: Optional[Dict[str, str]] = None):
    """Decorator to automatically record timing metrics."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = datetime.now()
            try:
                result = func(*args, **kwargs)
                metrics.record_timing(metric_name, start_time, tags)
                metrics.increment_counter(f"{metric_name}_success", tags=tags)
                return result
            except Exception as e:
                metrics.record_timing(metric_name, start_time, tags)
                metrics.increment_counter(f"{metric_name}_error", tags=tags)
                raise
        return wrapper
    return decorator