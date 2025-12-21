-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  changed_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view (Simulated by authenticated for this specific admin-tool context)
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to handle logging
CREATE OR REPLACE FUNCTION public.log_reservation_changes()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (reservation_id, action, new_data, changed_by)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (reservation_id, action, old_data, new_data, changed_by)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (reservation_id, action, old_data, changed_by)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS audit_reservation_changes ON public.reservations;
CREATE TRIGGER audit_reservation_changes
AFTER INSERT OR UPDATE OR DELETE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.log_reservation_changes();
