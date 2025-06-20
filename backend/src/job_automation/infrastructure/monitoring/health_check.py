"""Health check system for monitoring application status."""

from typing import Dict, List, Callable, Any, Optional
from datetime import datetime
from enum import Enum
import asyncio
import threading
import time


class HealthStatus(Enum):
    """Health check status values."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class HealthCheck:
    """Individual health check definition."""
    
    def __init__(self, name: str, check_func: Callable[[], bool], 
                 timeout: int = 30, description: str = ""):
        self.name = name
        self.check_func = check_func
        self.timeout = timeout
        self.description = description
        self.last_check_time: Optional[datetime] = None
        self.last_status: HealthStatus = HealthStatus.UNKNOWN
        self.last_error: Optional[str] = None
    
    def run_check(self) -> Dict[str, Any]:
        """Execute the health check."""
        start_time = datetime.now()
        
        try:
            # Run check with timeout
            result = self._run_with_timeout(self.check_func, self.timeout)
            
            if result:
                self.last_status = HealthStatus.HEALTHY
                self.last_error = None
            else:
                self.last_status = HealthStatus.UNHEALTHY
                self.last_error = "Check returned False"
            
        except TimeoutError:
            self.last_status = HealthStatus.UNHEALTHY
            self.last_error = f"Check timed out after {self.timeout} seconds"
        except Exception as e:
            self.last_status = HealthStatus.UNHEALTHY
            self.last_error = str(e)
        
        self.last_check_time = datetime.now()
        execution_time = (self.last_check_time - start_time).total_seconds()
        
        return {
            "name": self.name,
            "status": self.last_status.value,
            "description": self.description,
            "last_check_time": self.last_check_time.isoformat(),
            "execution_time": execution_time,
            "error": self.last_error
        }
    
    def _run_with_timeout(self, func: Callable, timeout: int) -> bool:
        """Run function with timeout."""
        result = [None]
        exception = [None]
        
        def target():
            try:
                result[0] = func()
            except Exception as e:
                exception[0] = e
        
        thread = threading.Thread(target=target)
        thread.daemon = True
        thread.start()
        thread.join(timeout)
        
        if thread.is_alive():
            raise TimeoutError(f"Function timed out after {timeout} seconds")
        
        if exception[0]:
            raise exception[0]
        
        return result[0]


class HealthChecker:
    """Manages and runs health checks for the application."""
    
    def __init__(self):
        self.checks: Dict[str, HealthCheck] = {}
        self.check_results: Dict[str, Dict[str, Any]] = {}
        self.overall_status: HealthStatus = HealthStatus.UNKNOWN
        self.last_check_time: Optional[datetime] = None
        self._check_thread: Optional[threading.Thread] = None
        self._running = False
        self._check_interval = 60  # seconds
    
    def register_check(self, name: str, check_func: Callable[[], bool], 
                      timeout: int = 30, description: str = "") -> None:
        """Register a health check."""
        self.checks[name] = HealthCheck(name, check_func, timeout, description)
    
    def run_all_checks(self) -> Dict[str, Any]:
        """Run all registered health checks."""
        if not self.checks:
            return {
                "overall_status": HealthStatus.UNKNOWN.value,
                "checks": [],
                "timestamp": datetime.now().isoformat(),
                "message": "No health checks registered"
            }
        
        check_results = []
        healthy_count = 0
        total_count = len(self.checks)
        
        for check in self.checks.values():
            result = check.run_check()
            check_results.append(result)
            self.check_results[check.name] = result
            
            if result["status"] == HealthStatus.HEALTHY.value:
                healthy_count += 1
        
        # Determine overall status
        if healthy_count == total_count:
            self.overall_status = HealthStatus.HEALTHY
        elif healthy_count > 0:
            self.overall_status = HealthStatus.DEGRADED
        else:
            self.overall_status = HealthStatus.UNHEALTHY
        
        self.last_check_time = datetime.now()
        
        return {
            "overall_status": self.overall_status.value,
            "healthy_checks": healthy_count,
            "total_checks": total_count,
            "checks": check_results,
            "timestamp": self.last_check_time.isoformat()
        }
    
    def run_check(self, name: str) -> Optional[Dict[str, Any]]:
        """Run a specific health check."""
        if name not in self.checks:
            return None
        
        result = self.checks[name].run_check()
        self.check_results[name] = result
        return result
    
    def get_status(self) -> Dict[str, Any]:
        """Get current health status."""
        return {
            "overall_status": self.overall_status.value,
            "last_check_time": self.last_check_time.isoformat() if self.last_check_time else None,
            "checks": list(self.check_results.values())
        }
    
    def start_periodic_checks(self, interval: int = 60):
        """Start periodic health checks in background."""
        self._check_interval = interval
        self._running = True
        
        def check_loop():
            while self._running:
                try:
                    self.run_all_checks()
                    time.sleep(self._check_interval)
                except Exception as e:
                    print(f"Error in health check loop: {e}")
                    time.sleep(self._check_interval)
        
        self._check_thread = threading.Thread(target=check_loop, daemon=True)
        self._check_thread.start()
    
    def stop_periodic_checks(self):
        """Stop periodic health checks."""
        self._running = False
        if self._check_thread:
            self._check_thread.join(timeout=5)
    
    def remove_check(self, name: str) -> bool:
        """Remove a health check."""
        if name in self.checks:
            del self.checks[name]
            if name in self.check_results:
                del self.check_results[name]
            return True
        return False
    
    def clear_all_checks(self):
        """Clear all health checks."""
        self.checks.clear()
        self.check_results.clear()
        self.overall_status = HealthStatus.UNKNOWN


# Global health checker instance
health_checker = HealthChecker()


def register_health_check(name: str, timeout: int = 30, description: str = ""):
    """Decorator to register a function as a health check."""
    def decorator(func: Callable[[], bool]):
        health_checker.register_check(name, func, timeout, description)
        return func
    return decorator


# Common health checks
def database_health_check() -> bool:
    """Example database health check."""
    try:
        # Add your database connection check here
        # For example: db.execute("SELECT 1")
        return True
    except Exception:
        return False


def api_health_check() -> bool:
    """Example API health check."""
    try:
        # Add your API endpoint check here
        # For example: requests.get("http://localhost:8000/health", timeout=5)
        return True
    except Exception:
        return False


def memory_health_check() -> bool:
    """Memory usage health check."""
    try:
        import psutil
        memory_usage = psutil.virtual_memory().percent
        return memory_usage < 90  # Alert if memory usage > 90%
    except ImportError:
        return True  # Skip check if psutil not available
    except Exception:
        return False