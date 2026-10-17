-- Additive migration. Apply after 001_restaurant_platform_schema.sql.
BEGIN;

CREATE TABLE public.staff_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
  role text NOT NULL CHECK (role IN ('owner','manager','waiter','cashier','kitchen')),
  can_collect boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true
);
CREATE FUNCTION public.staff_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM staff_users WHERE id = auth.uid() AND active $$;
CREATE FUNCTION public.require_role(roles text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(staff_role() = ANY(roles), false) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
END $$;

ALTER TABLE restaurant_settings ADD COLUMN timezone text NOT NULL DEFAULT 'Africa/Casablanca';
ALTER TABLE restaurant_settings ADD COLUMN tax_bps integer NOT NULL DEFAULT 0 CHECK (tax_bps BETWEEN 0 AND 10000);
ALTER TABLE restaurant_settings ADD COLUMN session_hours integer NOT NULL DEFAULT 6 CHECK (session_hours BETWEEN 1 AND 24);
ALTER TABLE restaurant_settings ADD COLUMN welcome_message text DEFAULT 'A little time. A beautiful table. Something extraordinary.';
ALTER TABLE menu_products ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE menu_products ADD CONSTRAINT nonnegative_product_price CHECK (price >= 0);
-- Retain products when a category is removed; preserve all order snapshots independently.
ALTER TABLE menu_products DROP CONSTRAINT menu_products_category_id_fkey;
ALTER TABLE menu_products ADD CONSTRAINT menu_products_category_id_fkey FOREIGN KEY(category_id) REFERENCES menu_categories(id) ON DELETE RESTRICT;

CREATE TABLE restaurant_zones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE);
CREATE TABLE restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number integer NOT NULL UNIQUE CHECK(number BETWEEN 1 AND 999),
  seats integer NOT NULL DEFAULT 2 CHECK(seats BETWEEN 1 AND 30), zone_id uuid REFERENCES restaurant_zones(id),
  state text NOT NULL DEFAULT 'available' CHECK(state IN ('available','occupied','ordering','awaiting_payment','cleaning','disabled')),
  qr_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), qr_active boolean NOT NULL DEFAULT true,
  assigned_to uuid REFERENCES staff_users(id)
);
CREATE TABLE table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), table_id uuid NOT NULL REFERENCES restaurant_tables(id),
  access_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), join_code text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  opened_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  closed_at timestamptz, opened_by uuid NOT NULL REFERENCES staff_users(id)
);
CREATE UNIQUE INDEX one_open_visit_per_table ON table_sessions(table_id) WHERE closed_at IS NULL;
CREATE TABLE menu_modifier_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES menu_products(id) ON DELETE CASCADE,
  name text NOT NULL, group_name text NOT NULL DEFAULT 'Extras', price_minor integer NOT NULL DEFAULT 0 CHECK(price_minor >= 0),
  available boolean NOT NULL DEFAULT true
);
CREATE TABLE recommendation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid NOT NULL REFERENCES menu_categories(id),
  recommended_product_id uuid NOT NULL REFERENCES menu_products(id), UNIQUE(category_id,recommended_product_id)
);
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  session_id uuid NOT NULL REFERENCES table_sessions(id), tracking_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL, status text NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','accepted','preparing','ready','served','completed','cancelled','rejected')),
  subtotal_minor integer NOT NULL DEFAULT 0 CHECK(subtotal_minor >= 0), tax_minor integer NOT NULL DEFAULT 0 CHECK(tax_minor >= 0),
  total_minor integer NOT NULL DEFAULT 0 CHECK(total_minor >= 0), notes text NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
  reason text, recognized_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id,idempotency_key), CHECK(total_minor = subtotal_minor + tax_minor)
);
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id),
  product_id uuid REFERENCES menu_products(id) ON DELETE SET NULL,
  name text NOT NULL, category_name text NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 50),
  unit_minor integer NOT NULL CHECK(unit_minor>=0), modifiers jsonb NOT NULL DEFAULT '[]',
  notes text NOT NULL DEFAULT '' CHECK(length(notes)<=500), line_minor integer NOT NULL CHECK(line_minor>=0),
  CHECK(line_minor=unit_minor*quantity)
);
CREATE TABLE order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id),
  status text NOT NULL, changed_by uuid REFERENCES staff_users(id), reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES table_sessions(id),
  amount_minor integer NOT NULL CHECK(amount_minor>0), method text NOT NULL CHECK(method IN ('cash','terminal','other')),
  reference text NOT NULL DEFAULT '' CHECK(length(reference)<=200), idempotency_key uuid NOT NULL UNIQUE,
  confirmed_by uuid NOT NULL REFERENCES staff_users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL REFERENCES payments(id),
  order_id uuid NOT NULL REFERENCES orders(id), amount_minor integer NOT NULL CHECK(amount_minor>0), UNIQUE(payment_id,order_id)
);
CREATE TABLE payment_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL UNIQUE REFERENCES payments(id),
  amount_minor integer NOT NULL CHECK(amount_minor>0), reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 500),
  staff_id uuid NOT NULL REFERENCES staff_users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES table_sessions(id),
  type text NOT NULL CHECK(type IN ('waiter','bill','water','assistance','cleaning')),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','acknowledged','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE UNIQUE INDEX unique_open_request ON service_requests(session_id,type) WHERE status <> 'resolved';
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor uuid REFERENCES staff_users(id), action text NOT NULL,
  entity_id uuid, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE daily_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_date date NOT NULL UNIQUE,
  timezone text NOT NULL, expected_cash_minor bigint NOT NULL, counted_cash_minor integer NOT NULL CHECK(counted_cash_minor>=0),
  difference_minor bigint GENERATED ALWAYS AS (counted_cash_minor::bigint-expected_cash_minor) STORED,
  snapshot jsonb NOT NULL, notes text NOT NULL DEFAULT '' CHECK(length(notes)<=1000),
  closed_by uuid NOT NULL REFERENCES staff_users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE guest_rate_limits (
  key text PRIMARY KEY, window_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 1
);
CREATE INDEX orders_session ON orders(session_id);
CREATE INDEX orders_created ON orders(created_at);
CREATE INDEX items_order ON order_items(order_id);
CREATE INDEX history_order ON order_status_history(order_id);
CREATE INDEX payments_created ON payments(created_at);
CREATE INDEX payments_session ON payments(session_id);
CREATE INDEX allocations_order ON payment_allocations(order_id);
CREATE INDEX adjustments_payment ON payment_adjustments(payment_id);
CREATE INDEX requests_session ON service_requests(session_id);

CREATE FUNCTION public.can_access_session(sid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(staff_role() IN ('owner','manager','cashier','kitchen') OR
   (staff_role()='waiter' AND EXISTS(SELECT 1 FROM table_sessions s JOIN restaurant_tables t ON t.id=s.table_id WHERE s.id=sid AND t.assigned_to=auth.uid())),false)
$$;
CREATE FUNCTION public.session_balance(sid uuid) RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce((SELECT sum(total_minor) FROM orders WHERE session_id=sid AND status NOT IN ('cancelled','rejected')),0)
  - coalesce((SELECT sum(amount_minor) FROM payments WHERE session_id=sid),0)
  + coalesce((SELECT sum(a.amount_minor) FROM payment_adjustments a JOIN payments p ON p.id=a.payment_id WHERE p.session_id=sid),0)
$$;
CREATE FUNCTION public.rate_limit(k text, max_attempts integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer;
BEGIN
 INSERT INTO guest_rate_limits(key) VALUES(k) ON CONFLICT(key) DO UPDATE
 SET attempts=CASE WHEN guest_rate_limits.window_at<now()-interval '1 minute' THEN 1 ELSE guest_rate_limits.attempts+1 END,
 window_at=CASE WHEN guest_rate_limits.window_at<now()-interval '1 minute' THEN now() ELSE guest_rate_limits.window_at END
 RETURNING attempts INTO n;
 IF n>max_attempts THEN RAISE EXCEPTION 'Please wait a minute before trying again'; END IF;
END $$;

-- Public guest access is limited to capability-scoped functions; never public table reads.
CREATE FUNCTION public.join_table(p_qr_token uuid DEFAULT NULL, p_number integer DEFAULT NULL, p_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t restaurant_tables; s table_sessions;
BEGIN
 SELECT * INTO t FROM restaurant_tables WHERE qr_active AND state NOT IN ('disabled','cleaning')
   AND ((p_qr_token IS NOT NULL AND qr_token=p_qr_token) OR (p_qr_token IS NULL AND number=p_number));
 IF NOT FOUND THEN RAISE EXCEPTION 'Table unavailable. Please ask your waiter.'; END IF;
 PERFORM rate_limit('join:'||t.id,40);
 SELECT * INTO s FROM table_sessions WHERE table_id=t.id AND closed_at IS NULL AND expires_at>now()
   AND (p_qr_token IS NOT NULL OR upper(p_code)=join_code);
 IF NOT FOUND THEN RETURN jsonb_build_object('error','No active visit or invalid table code. Please ask your waiter.'); END IF;
 RETURN jsonb_build_object('id',s.id,'token',s.access_token,'table',t.number,'expires_at',s.expires_at);
END $$;

CREATE FUNCTION public.place_order(p_token uuid,p_key uuid,p_items jsonb,p_notes text DEFAULT '',p_expected_minor integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s table_sessions; o orders; item jsonb; product menu_products; opt menu_modifier_options;
 mods jsonb; opt_id text; qty integer; unit integer; subtotal integer:=0; tax integer; tax_rate integer;
BEGIN
 SELECT * INTO s FROM table_sessions WHERE access_token=p_token FOR UPDATE;
 IF NOT FOUND OR s.closed_at IS NOT NULL OR s.expires_at<=now() THEN RAISE EXCEPTION 'Your table visit has ended. Please ask your waiter.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM restaurant_tables WHERE id=s.table_id AND qr_active AND state NOT IN ('disabled','cleaning')) THEN RAISE EXCEPTION 'Ordering is unavailable for this table'; END IF;
 SELECT * INTO o FROM orders WHERE session_id=s.id AND idempotency_key=p_key;
 IF FOUND THEN RETURN jsonb_build_object('id',o.id,'reference',o.reference,'token',o.tracking_token); END IF;
 PERFORM rate_limit('order:'||s.id,12);
 IF p_items IS NULL OR p_notes IS NULL OR jsonb_typeof(p_items)<>'array' THEN RAISE EXCEPTION 'Invalid order'; END IF;
 IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 OR length(p_notes)>1000 THEN RAISE EXCEPTION 'Invalid order'; END IF;
 INSERT INTO orders(session_id,idempotency_key,notes) VALUES(s.id,p_key,p_notes) RETURNING * INTO o;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
   SELECT * INTO product FROM menu_products WHERE id=(item->>'product_id')::uuid FOR SHARE;
   IF NOT FOUND OR NOT product.available OR product.archived OR NOT EXISTS(SELECT 1 FROM menu_categories WHERE id=product.category_id AND is_active) THEN RAISE EXCEPTION 'A selected product is unavailable'; END IF;
   qty:=(item->>'quantity')::integer;
   IF qty IS NULL OR qty NOT BETWEEN 1 AND 50 OR length(coalesce(item->>'notes',''))>500 THEN RAISE EXCEPTION 'Invalid quantity or instructions'; END IF;
   unit:=round(product.price*100)::integer; mods:='[]'::jsonb;
   IF jsonb_typeof(coalesce(item->'modifiers','[]'::jsonb))<>'array' OR jsonb_array_length(coalesce(item->'modifiers','[]'::jsonb))>20 THEN RAISE EXCEPTION 'Invalid modifiers'; END IF;
   FOR opt_id IN SELECT DISTINCT value FROM jsonb_array_elements_text(coalesce(item->'modifiers','[]'::jsonb)) LOOP
     SELECT * INTO opt FROM menu_modifier_options WHERE id=opt_id::uuid AND product_id=product.id AND available FOR SHARE;
     IF NOT FOUND THEN RAISE EXCEPTION 'A selected option is unavailable'; END IF;
     IF opt.group_name<>'Extras' AND EXISTS(SELECT 1 FROM jsonb_array_elements(mods) m WHERE m->>'group'=opt.group_name) THEN RAISE EXCEPTION 'Choose one option per preparation group'; END IF;
     unit:=unit+opt.price_minor;
     mods:=mods||jsonb_build_array(jsonb_build_object('name',opt.name,'group',opt.group_name,'price_minor',opt.price_minor));
   END LOOP;
   INSERT INTO order_items(order_id,product_id,name,category_name,quantity,unit_minor,modifiers,notes,line_minor)
   VALUES(o.id,product.id,product.name,(SELECT name FROM menu_categories WHERE id=product.category_id),qty,unit,mods,coalesce(item->>'notes',''),unit*qty);
   subtotal:=subtotal+unit*qty;
 END LOOP;
 SELECT tax_bps INTO tax_rate FROM restaurant_settings ORDER BY created_at LIMIT 1;
 tax:=round(subtotal*coalesce(tax_rate,0)::numeric/10000)::integer;
 IF p_expected_minor IS NOT NULL AND p_expected_minor<>subtotal+tax THEN RAISE EXCEPTION 'Prices have changed. Please review your refreshed selection before confirming.'; END IF;
 UPDATE orders SET subtotal_minor=subtotal,tax_minor=tax,total_minor=subtotal+tax WHERE id=o.id;
 INSERT INTO order_status_history(order_id,status) VALUES(o.id,'pending');
 UPDATE restaurant_tables SET state='ordering' WHERE id=s.table_id;
 RETURN jsonb_build_object('id',o.id,'reference',o.reference,'token',o.tracking_token);
END $$;

CREATE FUNCTION public.track_order(p_token uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('id',o.id,'reference',o.reference,'status',o.status,'reason',o.reason,'total_minor',o.total_minor,
 'created_at',o.created_at,'table',t.number,'items',(SELECT coalesce(jsonb_agg(to_jsonb(i)),'[]') FROM order_items i WHERE i.order_id=o.id),
 'history',(SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.created_at),'[]') FROM order_status_history h WHERE h.order_id=o.id),
 'paid_minor',(SELECT coalesce(sum(a.amount_minor),0) FROM payment_allocations a WHERE a.order_id=o.id AND NOT EXISTS(SELECT 1 FROM payment_adjustments r WHERE r.payment_id=a.payment_id)))
 FROM orders o JOIN table_sessions s ON s.id=o.session_id JOIN restaurant_tables t ON t.id=s.table_id WHERE o.tracking_token=p_token
$$;
CREATE FUNCTION public.request_service(p_token uuid,p_type text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s table_sessions; rid uuid;
BEGIN
 SELECT * INTO s FROM table_sessions WHERE access_token=p_token FOR UPDATE;
 IF NOT FOUND OR s.closed_at IS NOT NULL OR s.expires_at<=now() THEN RAISE EXCEPTION 'Please identify your active table first'; END IF;
 SELECT id INTO rid FROM service_requests WHERE session_id=s.id AND type=p_type AND status<>'resolved';
 IF FOUND THEN RETURN rid; END IF;
 PERFORM rate_limit('service:'||s.id,5);
 INSERT INTO service_requests(session_id,type) VALUES(s.id,p_type) RETURNING id INTO rid;
 IF p_type='bill' THEN UPDATE restaurant_tables SET state='awaiting_payment' WHERE id=s.table_id; END IF;
 RETURN rid;
END $$;

-- All staff commands are transactional and use the database identity, never a client-supplied role.
CREATE FUNCTION public.staff_action(p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t restaurant_tables; s table_sessions; o orders; p payments; rid uuid; amount integer; remaining bigint;
 allocated integer; due integer; next_status text; prior_role text; payment_key uuid; close_day date; zone_name text; expected_cash bigint; closing_snapshot jsonb;
BEGIN
 IF p_action IN ('create_table','open_session','rotate_qr','table_state','assign_table','zone','modifier','recommendation') THEN
   PERFORM require_role(ARRAY['owner','manager']);
 ELSIF p_action='staff' THEN PERFORM require_role(ARRAY['owner']);
 ELSIF p_action='refund' THEN PERFORM require_role(ARRAY['owner']);
 ELSIF p_action='daily_close' THEN PERFORM require_role(ARRAY['owner','manager','cashier']);
 ELSIF p_action IN ('close_session','request_status') THEN PERFORM require_role(ARRAY['owner','manager','waiter','cashier']);
 ELSIF p_action='order_status' THEN PERFORM require_role(ARRAY['owner','manager','waiter','kitchen']);
 ELSIF p_action='payment' THEN
   PERFORM require_role(ARRAY['owner','manager','cashier','waiter']);
   IF staff_role()='waiter' AND NOT EXISTS(SELECT 1 FROM staff_users WHERE id=auth.uid() AND can_collect) THEN RAISE EXCEPTION 'Payment permission required' USING ERRCODE='42501'; END IF;
 ELSE RAISE EXCEPTION 'Unknown staff action'; END IF;

 IF p_action='zone' THEN
   INSERT INTO restaurant_zones(name) VALUES(trim(p_payload->>'name')) RETURNING id INTO rid;
 ELSIF p_action='create_table' THEN
   INSERT INTO restaurant_tables(number,seats,zone_id) VALUES((p_payload->>'number')::integer,coalesce((p_payload->>'seats')::integer,2),nullif(p_payload->>'zone_id','')::uuid) RETURNING id INTO rid;
 ELSIF p_action IN ('open_session','rotate_qr','table_state','assign_table') THEN
   SELECT * INTO t FROM restaurant_tables WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Table not found'; END IF;
   rid:=t.id;
   IF p_action='open_session' THEN
     IF t.state IN ('disabled','cleaning') THEN RAISE EXCEPTION 'Make this table available first'; END IF;
     INSERT INTO table_sessions(table_id,opened_by,expires_at) VALUES(t.id,auth.uid(),now()+make_interval(hours=>coalesce((SELECT session_hours FROM restaurant_settings ORDER BY created_at LIMIT 1),6))) RETURNING id INTO rid;
     UPDATE restaurant_tables SET state='occupied' WHERE id=t.id;
   ELSIF p_action='rotate_qr' THEN UPDATE restaurant_tables SET qr_token=gen_random_uuid() WHERE id=t.id;
   ELSIF p_action='assign_table' THEN
     IF nullif(p_payload->>'staff_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM staff_users WHERE id=(p_payload->>'staff_id')::uuid AND role='waiter' AND active) THEN RAISE EXCEPTION 'Choose an active waiter'; END IF;
     UPDATE restaurant_tables SET assigned_to=nullif(p_payload->>'staff_id','')::uuid WHERE id=t.id;
   ELSE UPDATE restaurant_tables SET state=p_payload->>'state',qr_active=coalesce((p_payload->>'qr_active')::boolean,qr_active) WHERE id=t.id; END IF;
 ELSIF p_action='staff' THEN
   rid:=(p_payload->>'id')::uuid;
   -- Serialize owner changes so concurrent demotions cannot remove every owner.
   PERFORM pg_advisory_xact_lock(173401);
   SELECT role INTO prior_role FROM staff_users WHERE id=rid FOR UPDATE;
   IF prior_role='owner' AND ((p_payload->>'role')<>'owner' OR NOT (p_payload->>'active')::boolean)
      AND (SELECT count(*) FROM staff_users WHERE role='owner' AND active)<=1 THEN RAISE EXCEPTION 'Keep at least one active owner'; END IF;
   INSERT INTO staff_users(id,display_name,role,can_collect,active) VALUES(rid,p_payload->>'display_name',p_payload->>'role',coalesce((p_payload->>'can_collect')::boolean,false),coalesce((p_payload->>'active')::boolean,true))
   ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,role=excluded.role,can_collect=excluded.can_collect,active=excluded.active;
 ELSIF p_action='modifier' THEN
   IF p_payload->>'id' IS NOT NULL THEN
     UPDATE menu_modifier_options SET available=NOT available WHERE id=(p_payload->>'id')::uuid RETURNING id INTO rid;
   ELSE
     INSERT INTO menu_modifier_options(product_id,name,group_name,price_minor) VALUES((p_payload->>'product_id')::uuid,p_payload->>'name',coalesce(p_payload->>'group_name','Extras'),(p_payload->>'price_minor')::integer) RETURNING id INTO rid;
   END IF;
 ELSIF p_action='recommendation' THEN
   INSERT INTO recommendation_rules(category_id,recommended_product_id) VALUES((p_payload->>'category_id')::uuid,(p_payload->>'product_id')::uuid) ON CONFLICT DO NOTHING RETURNING id INTO rid;
 ELSIF p_action='order_status' THEN
   -- Always lock visit before orders, in the same order as payment and closing.
   SELECT session_id INTO rid FROM orders WHERE id=(p_payload->>'id')::uuid;
   SELECT * INTO s FROM table_sessions WHERE id=rid FOR UPDATE;
   IF NOT can_access_session(s.id) THEN RAISE EXCEPTION 'Table not assigned' USING ERRCODE='42501'; END IF;
   SELECT * INTO o FROM orders WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
   next_status:=p_payload->>'status';
   IF staff_role()='kitchen' AND NOT ((o.status='accepted' AND next_status='preparing') OR (o.status='preparing' AND next_status='ready')) THEN RAISE EXCEPTION 'Kitchen permission denied' USING ERRCODE='42501'; END IF;
   IF NOT ((o.status='pending' AND next_status IN ('accepted','rejected','cancelled')) OR (o.status='accepted' AND next_status IN ('preparing','cancelled')) OR (o.status='preparing' AND next_status IN ('ready','cancelled')) OR (o.status='ready' AND next_status='served') OR (o.status='served' AND next_status='completed')) THEN RAISE EXCEPTION 'Invalid order transition'; END IF;
   IF next_status IN ('cancelled','rejected') THEN
     IF length(trim(coalesce(p_payload->>'reason','')))<3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
     IF EXISTS(SELECT 1 FROM payment_allocations a WHERE a.order_id=o.id AND NOT EXISTS(SELECT 1 FROM payment_adjustments r WHERE r.payment_id=a.payment_id)) THEN RAISE EXCEPTION 'Refund allocated payments before cancellation'; END IF;
   END IF;
   UPDATE orders SET status=next_status,reason=p_payload->>'reason',updated_at=now(),recognized_at=CASE WHEN next_status='served' THEN now() ELSE recognized_at END WHERE id=o.id;
   INSERT INTO order_status_history(order_id,status,changed_by,reason) VALUES(o.id,next_status,auth.uid(),p_payload->>'reason');
   rid:=o.id;
 ELSIF p_action='request_status' THEN
   SELECT session_id INTO rid FROM service_requests WHERE id=(p_payload->>'id')::uuid;
   IF NOT can_access_session(rid) THEN RAISE EXCEPTION 'Table not assigned' USING ERRCODE='42501'; END IF;
   UPDATE service_requests SET status=p_payload->>'status',resolved_at=CASE WHEN p_payload->>'status'='resolved' THEN now() END
   WHERE id=(p_payload->>'id')::uuid AND ((status='pending' AND p_payload->>'status'='acknowledged') OR (status='acknowledged' AND p_payload->>'status'='resolved')) RETURNING id INTO rid;
   IF NOT FOUND THEN RAISE EXCEPTION 'Invalid service request transition'; END IF;
 ELSIF p_action='daily_close' THEN
   LOCK TABLE orders,payments,payment_adjustments IN SHARE MODE;
   SELECT timezone INTO zone_name FROM restaurant_settings ORDER BY created_at LIMIT 1;
   zone_name:=coalesce(zone_name,'Africa/Casablanca'); close_day:=(p_payload->>'date')::date;
   IF close_day IS NULL OR close_day>(now() AT TIME ZONE zone_name)::date THEN RAISE EXCEPTION 'Choose a current or past business day'; END IF;
   SELECT coalesce(sum(amount_minor),0) INTO expected_cash FROM payments WHERE method='cash' AND (created_at AT TIME ZONE zone_name)::date=close_day;
   SELECT expected_cash-coalesce(sum(adj.amount_minor),0) INTO expected_cash FROM payment_adjustments adj JOIN payments receipt ON receipt.id=adj.payment_id WHERE receipt.method='cash' AND (adj.created_at AT TIME ZONE zone_name)::date=close_day;
   SELECT jsonb_build_object('orders',count(*),'completed',count(*) FILTER(WHERE status='completed'),'cancelled',count(*) FILTER(WHERE status IN ('cancelled','rejected'))) INTO closing_snapshot FROM orders WHERE (created_at AT TIME ZONE zone_name)::date=close_day;
   closing_snapshot:=closing_snapshot||jsonb_build_object('net_sales_minor',(SELECT coalesce(sum(subtotal_minor),0) FROM orders WHERE (recognized_at AT TIME ZONE zone_name)::date=close_day AND status NOT IN ('cancelled','rejected')),
     'tax_minor',(SELECT coalesce(sum(tax_minor),0) FROM orders WHERE (recognized_at AT TIME ZONE zone_name)::date=close_day AND status NOT IN ('cancelled','rejected')),
     'receipts_minor',(SELECT coalesce(sum(amount_minor),0) FROM payments WHERE (created_at AT TIME ZONE zone_name)::date=close_day),
     'refunds_minor',(SELECT coalesce(sum(amount_minor),0) FROM payment_adjustments WHERE (created_at AT TIME ZONE zone_name)::date=close_day));
   INSERT INTO daily_closings(business_date,timezone,expected_cash_minor,counted_cash_minor,snapshot,notes,closed_by) VALUES(close_day,zone_name,expected_cash,(p_payload->>'counted_minor')::integer,closing_snapshot,coalesce(p_payload->>'notes',''),auth.uid()) RETURNING id INTO rid;
 ELSE
   IF p_action='refund' THEN
     SELECT session_id INTO rid FROM payments WHERE id=(p_payload->>'id')::uuid;
   ELSE rid:=(p_payload->>'session_id')::uuid; END IF;
   SELECT * INTO s FROM table_sessions WHERE id=rid FOR UPDATE;
   IF NOT FOUND OR NOT can_access_session(s.id) THEN RAISE EXCEPTION 'Visit unavailable or not assigned' USING ERRCODE='42501'; END IF;
   IF p_action='close_session' THEN
     IF session_balance(s.id)<>0 THEN RAISE EXCEPTION 'Settle the bill before closing this visit'; END IF;
     IF EXISTS(SELECT 1 FROM orders WHERE session_id=s.id AND status NOT IN ('completed','cancelled','rejected')) THEN RAISE EXCEPTION 'Complete all orders before closing'; END IF;
     UPDATE table_sessions SET closed_at=now() WHERE id=s.id;
     UPDATE restaurant_tables SET state='cleaning' WHERE id=s.table_id;
     UPDATE service_requests SET status='resolved',resolved_at=now() WHERE session_id=s.id AND status<>'resolved';
   ELSIF p_action='payment' THEN
     payment_key:=(p_payload->>'key')::uuid;
     SELECT * INTO p FROM payments WHERE idempotency_key=payment_key;
     IF FOUND THEN
       IF p.session_id<>s.id THEN RAISE EXCEPTION 'Payment key already used'; END IF;
       RETURN jsonb_build_object('id',p.id);
     END IF;
     IF s.closed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM payment_adjustments adj JOIN payments receipt ON receipt.id=adj.payment_id WHERE receipt.session_id=s.id) THEN RAISE EXCEPTION 'Visit already closed'; END IF;
     amount:=(p_payload->>'amount_minor')::integer;
     remaining:=session_balance(s.id);
     IF amount IS NULL OR amount<=0 OR amount>remaining THEN RAISE EXCEPTION 'Amount exceeds remaining balance or is invalid'; END IF;
     INSERT INTO payments(session_id,amount_minor,method,reference,idempotency_key,confirmed_by) VALUES(s.id,amount,p_payload->>'method',coalesce(p_payload->>'reference',''),payment_key,auth.uid()) RETURNING * INTO p;
     allocated:=amount;
     FOR o IN SELECT * FROM orders WHERE session_id=s.id AND status NOT IN ('cancelled','rejected') ORDER BY created_at,id FOR UPDATE LOOP
       SELECT o.total_minor-coalesce(sum(a.amount_minor),0) INTO due FROM payment_allocations a WHERE a.order_id=o.id AND NOT EXISTS(SELECT 1 FROM payment_adjustments r WHERE r.payment_id=a.payment_id);
       IF due>0 AND allocated>0 THEN
         INSERT INTO payment_allocations(payment_id,order_id,amount_minor) VALUES(p.id,o.id,least(due,allocated));
         allocated:=allocated-least(due,allocated);
       END IF;
     END LOOP;
     IF allocated<>0 THEN RAISE EXCEPTION 'Payment allocation failed'; END IF;
     IF amount=remaining THEN UPDATE service_requests SET status='resolved',resolved_at=now() WHERE session_id=s.id AND type='bill' AND status<>'resolved'; END IF;
     rid:=p.id;
   ELSIF p_action='refund' THEN
     SELECT * INTO p FROM payments WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
     INSERT INTO payment_adjustments(payment_id,amount_minor,reason,staff_id) VALUES(p.id,p.amount_minor,p_payload->>'reason',auth.uid()) RETURNING id INTO rid;
   END IF;
 END IF;
 INSERT INTO audit_log(actor,action,entity_id,detail) VALUES(auth.uid(),p_action,rid,p_payload-'key');
 RETURN jsonb_build_object('id',rid);
END $$;

-- Tighten legacy policies without removing data or changing the existing API shape.
DO $$ DECLARE t text; pol record; BEGIN
 FOREACH t IN ARRAY ARRAY['restaurant_settings','menu_categories','menu_products','wifi_settings','qr_code_settings'] LOOP
   FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd<>'SELECT' LOOP
     EXECUTE format('DROP POLICY %I ON %I',pol.policyname,t);
   END LOOP;
   EXECUTE format('CREATE POLICY staff_write ON %I FOR ALL TO authenticated USING (public.staff_role() IN (''owner'',''manager'')) WITH CHECK (public.staff_role() IN (''owner'',''manager''))',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['guest_feedback','analytics_events'] LOOP
   FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd<>'INSERT' LOOP
     EXECUTE format('DROP POLICY %I ON %I',pol.policyname,t);
   END LOOP;
   EXECUTE format('CREATE POLICY staff_read ON %I FOR SELECT TO authenticated USING (public.staff_role() IN (''owner'',''manager''))',t);
 END LOOP;
 CREATE POLICY feedback_staff_update ON guest_feedback FOR UPDATE TO authenticated USING (staff_role() IN ('owner','manager')) WITH CHECK (staff_role() IN ('owner','manager'));
 CREATE POLICY feedback_staff_delete ON guest_feedback FOR DELETE TO authenticated USING (staff_role() IN ('owner','manager'));
END $$;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['staff_users','restaurant_zones','restaurant_tables','table_sessions','menu_modifier_options','recommendation_rules','orders','order_items','order_status_history','payments','payment_allocations','payment_adjustments','service_requests','audit_log','daily_closings','guest_rate_limits'] LOOP
   EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated',t);
 END LOOP;
END $$;
GRANT SELECT ON staff_users,restaurant_zones,restaurant_tables,table_sessions,orders,order_items,order_status_history,payments,payment_allocations,payment_adjustments,service_requests,audit_log TO authenticated;
GRANT SELECT ON daily_closings TO authenticated;
CREATE POLICY closing_finance ON daily_closings FOR SELECT TO authenticated USING (staff_role() IN ('owner','manager','cashier'));
GRANT SELECT ON menu_modifier_options,recommendation_rules TO anon,authenticated;
CREATE POLICY staff_self ON staff_users FOR SELECT TO authenticated USING (id=auth.uid() OR staff_role() IN ('owner','manager'));
CREATE POLICY zones_staff ON restaurant_zones FOR SELECT TO authenticated USING (staff_role() IS NOT NULL);
CREATE POLICY tables_staff ON restaurant_tables FOR SELECT TO authenticated USING (staff_role() IN ('owner','manager','cashier','kitchen') OR (staff_role()='waiter' AND assigned_to=auth.uid()));
CREATE POLICY sessions_staff ON table_sessions FOR SELECT TO authenticated USING (can_access_session(id));
CREATE POLICY orders_staff ON orders FOR SELECT TO authenticated USING (can_access_session(session_id));
CREATE POLICY items_staff ON order_items FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM orders WHERE id=order_id));
CREATE POLICY history_staff ON order_status_history FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM orders WHERE id=order_id));
CREATE POLICY payments_finance ON payments FOR SELECT TO authenticated USING (staff_role() IN ('owner','manager','cashier') OR (staff_role()='waiter' AND can_access_session(session_id)));
CREATE POLICY allocations_finance ON payment_allocations FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM payments WHERE id=payment_id));
CREATE POLICY adjustments_finance ON payment_adjustments FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM payments WHERE id=payment_id));
CREATE POLICY requests_staff ON service_requests FOR SELECT TO authenticated USING (staff_role()<>'kitchen' AND can_access_session(session_id));
CREATE POLICY audit_owner ON audit_log FOR SELECT TO authenticated USING (staff_role()='owner');
CREATE POLICY modifiers_public ON menu_modifier_options FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY rules_public ON recommendation_rules FOR SELECT TO anon,authenticated USING (true);

-- Functions are not executable by PUBLIC; explicitly grant only the intended entrypoints.
REVOKE ALL ON FUNCTION staff_role(),require_role(text[]),can_access_session(uuid),session_balance(uuid),rate_limit(text,integer),join_table(uuid,integer,text),place_order(uuid,uuid,jsonb,text,integer),track_order(uuid),request_service(uuid,text),staff_action(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION staff_role(),can_access_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION join_table(uuid,integer,text),place_order(uuid,uuid,jsonb,text,integer),track_order(uuid),request_service(uuid,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION staff_action(text,jsonb) TO authenticated;

-- Realtime is optional; clients periodically reconcile and recover after reconnecting.
DO $$ DECLARE t text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
   FOREACH t IN ARRAY ARRAY['orders','order_items','restaurant_tables','table_sessions','payments','payment_adjustments','service_requests'] LOOP
     IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename=t AND schemaname='public') THEN
       EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I',t);
     END IF;
   END LOOP;
 END IF;
END $$;

-- Supabase Storage is optional for self-hosted Postgres installations.
DO $$ BEGIN
 IF to_regclass('storage.buckets') IS NOT NULL THEN
   INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
   VALUES('menu-images','menu-images',true,5242880,ARRAY['image/jpeg','image/png','image/webp'])
   ON CONFLICT(id) DO NOTHING;
   CREATE POLICY restaurant_image_read ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='menu-images');
   CREATE POLICY restaurant_image_upload ON storage.objects FOR INSERT TO authenticated
     WITH CHECK(bucket_id='menu-images' AND public.staff_role() IN ('owner','manager'));
 END IF;
END $$;

CREATE FUNCTION public.audit_configuration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL THEN
   INSERT INTO audit_log(actor,action,entity_id,detail) VALUES(auth.uid(),lower(TG_OP)||':'||TG_TABLE_NAME,coalesce(NEW.id,OLD.id),jsonb_build_object('table',TG_TABLE_NAME));
 END IF;
 RETURN coalesce(NEW,OLD);
END $$;
CREATE FUNCTION public.portal_activity() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM require_role(ARRAY['owner','manager']);
 RETURN jsonb_build_object(
  'views',(SELECT count(*) FROM analytics_events WHERE event_type='page_view'),
  'products',(SELECT count(*) FROM menu_products WHERE NOT archived),
  'categories',(SELECT count(*) FROM menu_categories WHERE is_active),
  'feedback',(SELECT count(*) FROM guest_feedback),
  'rating',(SELECT round(avg(rating),1) FROM guest_feedback),
  'pages',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM (SELECT page,count(*) AS count FROM analytics_events WHERE event_type='page_view' GROUP BY page ORDER BY count(*) DESC) p),
  'actions',(SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]') FROM (SELECT action,count(*) AS count FROM analytics_events WHERE event_type='button_click' GROUP BY action ORDER BY count(*) DESC) a));
END $$;
REVOKE ALL ON FUNCTION portal_activity() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION portal_activity() TO authenticated;
REVOKE ALL ON FUNCTION audit_configuration() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['restaurant_settings','wifi_settings','qr_code_settings','menu_products','menu_categories'] LOOP
   EXECUTE format('CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_configuration()',t);
 END LOOP;
END $$;
COMMIT;
