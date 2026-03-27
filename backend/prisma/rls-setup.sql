-- PostgreSQL Row Level Security Setup for Multi-Tenancy
-- Run this after Prisma migrations

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text search

-- Enable RLS on all org-scoped tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization isolation
-- All queries will be automatically filtered by org_id

CREATE POLICY org_isolation_organizations ON organizations
  USING (id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_users ON users
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_departments ON departments
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_meeting_series ON meeting_series
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_meetings ON meetings
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_meeting_notes ON meeting_notes
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_actions ON actions
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_meeting_attendees ON meeting_attendees
  USING (meeting_id IN (
    SELECT id FROM meetings WHERE org_id::text = current_setting('app.current_org_id', true)
  ));

CREATE POLICY org_isolation_events ON events
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_event_attendees ON event_attendees
  USING (event_id IN (
    SELECT id FROM events WHERE org_id::text = current_setting('app.current_org_id', true)
  ));

CREATE POLICY org_isolation_policies ON policies
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_policy_versions ON policy_versions
  USING (policy_id IN (
    SELECT id FROM policies WHERE org_id::text = current_setting('app.current_org_id', true)
  ));

CREATE POLICY org_isolation_policy_approvals ON policy_approvals
  USING (policy_id IN (
    SELECT id FROM policies WHERE org_id::text = current_setting('app.current_org_id', true)
  ));

CREATE POLICY org_isolation_policy_acknowledgments ON policy_acknowledgments
  USING (policy_id IN (
    SELECT id FROM policies WHERE org_id::text = current_setting('app.current_org_id', true)
  ));

CREATE POLICY org_isolation_notifications ON notifications
  USING (user_id IN (
    SELECT id FROM users WHERE org_id::text = current_setting('app.current_org_id', true)
  ));

CREATE POLICY org_isolation_comments ON comments
  USING (user_id IN (
    SELECT id FROM users WHERE org_id::text = current_setting('app.current_org_id', true)
  ));

CREATE POLICY org_isolation_tags ON tags
  USING (created_by_id IN (
    SELECT id FROM users WHERE org_id::text = current_setting('app.current_org_id', true)
  ));

CREATE POLICY org_isolation_audit_logs ON audit_logs
  USING (org_id::text = current_setting('app.current_org_id', true));

CREATE POLICY org_isolation_file_uploads ON file_uploads
  USING (
    CASE 
      WHEN entity_type = 'meeting' THEN entity_id IN (
        SELECT id FROM meetings WHERE org_id::text = current_setting('app.current_org_id', true)
      )
      WHEN entity_type = 'event' THEN entity_id IN (
        SELECT id FROM events WHERE org_id::text = current_setting('app.current_org_id', true)
      )
      WHEN entity_type = 'policy' THEN entity_id IN (
        SELECT id FROM policies WHERE org_id::text = current_setting('app.current_org_id', true)
      )
      ELSE false
    END
  );

-- Create indexes for RLS performance
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_meetings_org_id ON meetings(org_id);
CREATE INDEX idx_events_org_id ON events(org_id);
CREATE INDEX idx_policies_org_id ON policies(org_id);
CREATE INDEX idx_meeting_notes_org_id ON meeting_notes(org_id);
CREATE INDEX idx_actions_org_id ON actions(org_id);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);

-- Create function to set current org context (called by middleware)
CREATE OR REPLACE FUNCTION set_current_org(org_uuid TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_org_id', org_uuid, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_current_org(TEXT) TO PUBLIC;

-- Create function to get current org context
CREATE OR REPLACE FUNCTION get_current_org()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_org_id', true);
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_current_org() TO PUBLIC;

-- Comments for documentation
COMMENT ON FUNCTION set_current_org IS 'Sets the current organization context for RLS policies';
COMMENT ON FUNCTION get_current_org IS 'Gets the current organization context';
