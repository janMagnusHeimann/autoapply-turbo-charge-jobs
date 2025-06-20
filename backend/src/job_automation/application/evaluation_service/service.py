"""
Service for evaluating agent performance.
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import json
import statistics
from collections import defaultdict

from ...core.memory.memory_manager import MemoryManager
from ...core.utils.validation import validate_data
from ...infrastructure.monitoring.logger import get_logger

logger = get_logger(__name__)


class EvaluationService:
    """Service for evaluating AI agent performance and effectiveness."""
    
    def __init__(self, memory_manager: MemoryManager):
        """
        Initialize evaluation service.
        
        Args:
            memory_manager: Memory management instance
        """
        self.memory_manager = memory_manager
        self.evaluation_criteria = {
            'response_time': {'weight': 0.2, 'target': 2.0},  # seconds
            'success_rate': {'weight': 0.3, 'target': 0.9},   # percentage
            'user_satisfaction': {'weight': 0.3, 'target': 0.8},  # rating 0-1
            'tool_effectiveness': {'weight': 0.2, 'target': 0.85}  # success rate
        }
    
    def evaluate_agent_performance(self, agent_name: str, 
                                 time_period: Optional[timedelta] = None) -> Dict[str, Any]:
        """
        Evaluate overall agent performance.
        
        Args:
            agent_name: Name of agent to evaluate
            time_period: Time period for evaluation (default: last 24 hours)
        
        Returns:
            Dict containing evaluation results
        """
        if time_period is None:
            time_period = timedelta(hours=24)
        
        logger.info(f"Evaluating performance for agent: {agent_name}")
        
        # Get agent data from memory
        agent_data = self._get_agent_data(agent_name, time_period)
        
        if not agent_data:
            return {
                'agent_name': agent_name,
                'evaluation_time': datetime.now().isoformat(),
                'error': 'No data available for evaluation'
            }
        
        # Calculate metrics
        metrics = {
            'response_time': self._calculate_response_time_metric(agent_data),
            'success_rate': self._calculate_success_rate_metric(agent_data),
            'user_satisfaction': self._calculate_user_satisfaction_metric(agent_data),
            'tool_effectiveness': self._calculate_tool_effectiveness_metric(agent_data)
        }
        
        # Calculate overall score
        overall_score = self._calculate_overall_score(metrics)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(metrics, agent_name)
        
        evaluation_result = {
            'agent_name': agent_name,
            'evaluation_time': datetime.now().isoformat(),
            'time_period_hours': time_period.total_seconds() / 3600,
            'metrics': metrics,
            'overall_score': overall_score,
            'recommendations': recommendations,
            'data_points': len(agent_data)
        }
        
        # Store evaluation in memory
        self.memory_manager.add_experience(
            "agent_evaluation",
            evaluation_result,
            "completed"
        )
        
        return evaluation_result
    
    def _get_agent_data(self, agent_name: str, time_period: timedelta) -> List[Dict[str, Any]]:
        """Get agent data from memory for the specified time period."""
        cutoff_time = datetime.now() - time_period
        
        # Get relevant data from memory
        agent_experiences = self.memory_manager.get_experiences_by_category("chat_session")
        agent_responses = self.memory_manager.get_recent_short_term_memory("agent_response", limit=1000)
        tool_executions = self.memory_manager.get_experiences_by_category("tool_execution")
        
        agent_data = []
        
        # Filter and combine data
        for exp in agent_experiences:
            if (exp.get('metadata', {}).get('agent_name') == agent_name and 
                exp.get('timestamp', datetime.min) > cutoff_time):
                agent_data.append({
                    'type': 'session',
                    'data': exp,
                    'timestamp': exp.get('timestamp')
                })
        
        for response in agent_responses:
            if (response.get('agent') == agent_name and 
                response.get('timestamp', datetime.min) > cutoff_time):
                agent_data.append({
                    'type': 'response',
                    'data': response,
                    'timestamp': response.get('timestamp')
                })
        
        for tool_exec in tool_executions:
            if (tool_exec.get('metadata', {}).get('agent_name') == agent_name and 
                tool_exec.get('timestamp', datetime.min) > cutoff_time):
                agent_data.append({
                    'type': 'tool_execution',
                    'data': tool_exec,
                    'timestamp': tool_exec.get('timestamp')
                })
        
        return agent_data
    
    def _calculate_response_time_metric(self, agent_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate response time metrics."""
        response_times = []
        
        for item in agent_data:
            if item['type'] == 'response':
                # Extract response time if available
                metadata = item['data'].get('metadata', {})
                if 'response_time' in metadata:
                    response_times.append(metadata['response_time'])
        
        if not response_times:
            return {
                'average': None,
                'median': None,
                'score': 0.0,
                'status': 'no_data'
            }
        
        avg_time = statistics.mean(response_times)
        median_time = statistics.median(response_times)
        target_time = self.evaluation_criteria['response_time']['target']
        
        # Score: 1.0 if under target, decreasing as time increases
        score = max(0.0, min(1.0, target_time / avg_time))
        
        return {
            'average': avg_time,
            'median': median_time,
            'target': target_time,
            'score': score,
            'status': 'excellent' if score > 0.9 else 'good' if score > 0.7 else 'needs_improvement'
        }
    
    def _calculate_success_rate_metric(self, agent_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate success rate metrics."""
        total_interactions = 0
        successful_interactions = 0
        
        for item in agent_data:
            if item['type'] == 'response':
                total_interactions += 1
                if not item['data'].get('error', False):
                    successful_interactions += 1
        
        if total_interactions == 0:
            return {
                'rate': None,
                'score': 0.0,
                'status': 'no_data'
            }
        
        success_rate = successful_interactions / total_interactions
        target_rate = self.evaluation_criteria['success_rate']['target']
        
        # Score based on how close to target
        score = min(1.0, success_rate / target_rate)
        
        return {
            'rate': success_rate,
            'successful': successful_interactions,
            'total': total_interactions,
            'target': target_rate,
            'score': score,
            'status': 'excellent' if score > 0.95 else 'good' if score > 0.8 else 'needs_improvement'
        }
    
    def _calculate_user_satisfaction_metric(self, agent_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate user satisfaction metrics."""
        # This would typically come from user feedback
        # For now, we'll estimate based on session completion and error rates
        
        completed_sessions = 0
        total_sessions = 0
        error_sessions = 0
        
        for item in agent_data:
            if item['type'] == 'session':
                total_sessions += 1
                session_data = item['data']
                if session_data.get('status') == 'completed':
                    completed_sessions += 1
                if session_data.get('errors', 0) > 0:
                    error_sessions += 1
        
        if total_sessions == 0:
            return {
                'estimated_satisfaction': None,
                'score': 0.0,
                'status': 'no_data'
            }
        
        # Estimate satisfaction based on completion rate and error rate
        completion_rate = completed_sessions / total_sessions
        error_rate = error_sessions / total_sessions
        estimated_satisfaction = (completion_rate * 0.7) + ((1 - error_rate) * 0.3)
        
        target_satisfaction = self.evaluation_criteria['user_satisfaction']['target']
        score = min(1.0, estimated_satisfaction / target_satisfaction)
        
        return {
            'estimated_satisfaction': estimated_satisfaction,
            'completion_rate': completion_rate,
            'error_rate': error_rate,
            'target': target_satisfaction,
            'score': score,
            'status': 'excellent' if score > 0.9 else 'good' if score > 0.7 else 'needs_improvement'
        }
    
    def _calculate_tool_effectiveness_metric(self, agent_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate tool effectiveness metrics."""
        tool_executions = []
        
        for item in agent_data:
            if item['type'] == 'tool_execution':
                tool_executions.append(item['data'])
        
        if not tool_executions:
            return {
                'effectiveness': None,
                'score': 0.0,
                'status': 'no_data'
            }
        
        successful_tools = sum(1 for tool in tool_executions if tool.get('status') == 'success')
        effectiveness = successful_tools / len(tool_executions)
        
        target_effectiveness = self.evaluation_criteria['tool_effectiveness']['target']
        score = min(1.0, effectiveness / target_effectiveness)
        
        return {
            'effectiveness': effectiveness,
            'successful': successful_tools,
            'total': len(tool_executions),
            'target': target_effectiveness,
            'score': score,
            'status': 'excellent' if score > 0.9 else 'good' if score > 0.8 else 'needs_improvement'
        }
    
    def _calculate_overall_score(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate weighted overall score."""
        total_score = 0.0
        total_weight = 0.0
        
        for metric_name, metric_data in metrics.items():
            if metric_data['score'] is not None:
                weight = self.evaluation_criteria[metric_name]['weight']
                total_score += metric_data['score'] * weight
                total_weight += weight
        
        if total_weight == 0:
            return {
                'score': 0.0,
                'grade': 'F',
                'status': 'insufficient_data'
            }
        
        overall_score = total_score / total_weight
        
        # Assign grade
        if overall_score >= 0.9:
            grade = 'A'
        elif overall_score >= 0.8:
            grade = 'B'
        elif overall_score >= 0.7:
            grade = 'C'
        elif overall_score >= 0.6:
            grade = 'D'
        else:
            grade = 'F'
        
        return {
            'score': overall_score,
            'grade': grade,
            'status': 'excellent' if grade in ['A'] else 'good' if grade in ['B', 'C'] else 'needs_improvement'
        }
    
    def _generate_recommendations(self, metrics: Dict[str, Any], agent_name: str) -> List[str]:
        """Generate improvement recommendations based on metrics."""
        recommendations = []
        
        # Response time recommendations
        response_metric = metrics.get('response_time', {})
        if response_metric.get('status') == 'needs_improvement':
            recommendations.append(
                "Consider optimizing response time by caching frequent queries or improving tool execution speed"
            )
        
        # Success rate recommendations
        success_metric = metrics.get('success_rate', {})
        if success_metric.get('status') == 'needs_improvement':
            recommendations.append(
                "Improve error handling and add more robust input validation to increase success rate"
            )
        
        # User satisfaction recommendations
        satisfaction_metric = metrics.get('user_satisfaction', {})
        if satisfaction_metric.get('status') == 'needs_improvement':
            recommendations.append(
                "Consider improving response quality and adding more helpful context to increase user satisfaction"
            )
        
        # Tool effectiveness recommendations
        tool_metric = metrics.get('tool_effectiveness', {})
        if tool_metric.get('status') == 'needs_improvement':
            recommendations.append(
                "Review tool implementations and add better error handling for improved tool effectiveness"
            )
        
        # General recommendations
        if not recommendations:
            recommendations.append(f"Agent {agent_name} is performing well. Continue monitoring performance.")
        
        return recommendations
    
    def generate_evaluation_report(self, agent_name: str, 
                                 time_period: Optional[timedelta] = None) -> str:
        """Generate a formatted evaluation report."""
        evaluation = self.evaluate_agent_performance(agent_name, time_period)
        
        if 'error' in evaluation:
            return f"# Evaluation Report for {agent_name}\\n\\nError: {evaluation['error']}"
        
        report = f"""# Evaluation Report for {evaluation['agent_name']}

**Evaluation Time:** {evaluation['evaluation_time']}
**Time Period:** {evaluation['time_period_hours']:.1f} hours
**Data Points:** {evaluation['data_points']}

## Overall Score: {evaluation['overall_score']['score']:.2f} (Grade: {evaluation['overall_score']['grade']})

## Detailed Metrics

### Response Time
- **Score:** {evaluation['metrics']['response_time']['score']:.2f}
- **Status:** {evaluation['metrics']['response_time']['status']}
- **Average:** {evaluation['metrics']['response_time'].get('average', 'N/A')}s
- **Target:** {evaluation['metrics']['response_time'].get('target', 'N/A')}s

### Success Rate
- **Score:** {evaluation['metrics']['success_rate']['score']:.2f}
- **Status:** {evaluation['metrics']['success_rate']['status']}
- **Rate:** {evaluation['metrics']['success_rate'].get('rate', 'N/A'):.1%}
- **Successful/Total:** {evaluation['metrics']['success_rate'].get('successful', 'N/A')}/{evaluation['metrics']['success_rate'].get('total', 'N/A')}

### User Satisfaction
- **Score:** {evaluation['metrics']['user_satisfaction']['score']:.2f}
- **Status:** {evaluation['metrics']['user_satisfaction']['status']}
- **Estimated Satisfaction:** {evaluation['metrics']['user_satisfaction'].get('estimated_satisfaction', 'N/A'):.1%}

### Tool Effectiveness
- **Score:** {evaluation['metrics']['tool_effectiveness']['score']:.2f}
- **Status:** {evaluation['metrics']['tool_effectiveness']['status']}
- **Effectiveness:** {evaluation['metrics']['tool_effectiveness'].get('effectiveness', 'N/A'):.1%}

## Recommendations

"""
        
        for i, rec in enumerate(evaluation['recommendations'], 1):
            report += f"{i}. {rec}\\n"
        
        return report