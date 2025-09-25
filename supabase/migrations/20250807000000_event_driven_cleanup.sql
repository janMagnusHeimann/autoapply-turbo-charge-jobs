-- Event-Driven Architecture Database Cleanup and Setup
-- Removes legacy tables and adds event store

-- Drop unused tables from old agent system (if they exist)
DROP TABLE IF EXISTS agent_memories CASCADE;
DROP TABLE IF EXISTS agent_tools CASCADE;
DROP TABLE IF EXISTS job_discovery_sessions CASCADE;
DROP TABLE IF EXISTS career_discovery_results CASCADE;
DROP TABLE IF EXISTS job_extraction_results CASCADE;
DROP TABLE IF EXISTS job_matching_results CASCADE;

-- Create event store table for event-driven architecture
CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  correlation_id UUID,
  priority VARCHAR(20) DEFAULT 'normal',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient event queries
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_events_priority ON events(priority);

-- Create index for event replay by date range (without WHERE clause for immutability)
CREATE INDEX IF NOT EXISTS idx_events_timestamp_range ON events(timestamp DESC);

-- Create composite index for user event queries
CREATE INDEX IF NOT EXISTS idx_events_user_type ON events(user_id, event_type, timestamp DESC);

-- Enable Row Level Security on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events table
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all events" ON events
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create event statistics view for monitoring
CREATE OR REPLACE VIEW event_statistics AS
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  event_type,
  priority,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM events
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp), event_type, priority
ORDER BY hour DESC;

-- Grant access to the view
GRANT SELECT ON event_statistics TO authenticated;

-- Create function to clean old events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS void AS $$
BEGIN
  DELETE FROM events 
  WHERE timestamp < NOW() - INTERVAL '30 days'
    AND priority != 'urgent';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to run cleanup daily (requires pg_cron extension)
-- Note: pg_cron must be enabled in Supabase dashboard
-- SELECT cron.schedule('cleanup-old-events', '0 2 * * *', 'SELECT cleanup_old_events();');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create table for tracking event processing status (optional)
CREATE TABLE IF NOT EXISTS event_processing_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
  processor VARCHAR(100) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for processing status
CREATE INDEX IF NOT EXISTS idx_processing_status_event_id ON event_processing_status(event_id);
CREATE INDEX IF NOT EXISTS idx_processing_status_status ON event_processing_status(status);
CREATE INDEX IF NOT EXISTS idx_processing_status_processor ON event_processing_status(processor);

-- Enable RLS on processing status
ALTER TABLE event_processing_status ENABLE ROW LEVEL SECURITY;

-- RLS for processing status (service role only)
CREATE POLICY "Service role can manage processing status" ON event_processing_status
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE events IS 'Event store for event-driven architecture';
COMMENT ON COLUMN events.event_id IS 'Unique identifier for the event';
COMMENT ON COLUMN events.event_type IS 'Type of event (job.found, cv.generated, etc.)';
COMMENT ON COLUMN events.user_id IS 'User who triggered the event';
COMMENT ON COLUMN events.correlation_id IS 'ID to correlate related events';
COMMENT ON COLUMN events.priority IS 'Event priority (low, normal, high, urgent)';
COMMENT ON COLUMN events.data IS 'Full event data in JSON format';
COMMENT ON COLUMN events.metadata IS 'Additional metadata for the event';

COMMENT ON TABLE event_processing_status IS 'Tracks processing status of events by different consumers';
COMMENT ON COLUMN event_processing_status.processor IS 'Name of the service/worker processing the event';
COMMENT ON COLUMN event_processing_status.retry_count IS 'Number of retry attempts';