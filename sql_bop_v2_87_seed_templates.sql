-- ============================================================
-- BOP V2 — Phase 87: Seed 5 automation templates (T3.5)
-- Run AFTER sql_bop_v2_86. Requires a valid tenant_id.
-- ============================================================

DO $$
DECLARE
  v_tenant UUID;
  t1 UUID; t2 UUID; t3 UUID; t4 UUID; t5 UUID;
BEGIN
  SELECT tenant_id INTO v_tenant FROM op_tasks WHERE deleted_at IS NULL LIMIT 1;
  IF v_tenant IS NULL THEN
    SELECT tenant_id INTO v_tenant FROM bop_users WHERE tenant_id IS NOT NULL LIMIT 1;
  END IF;
  IF v_tenant IS NULL THEN
    RAISE NOTICE 'No tenant found — skipping seed';
    RETURN;
  END IF;

  -- 1) Inquiry Response (1 step, 2h SLA)
  INSERT INTO op_task_templates (id, tenant_id, name, name_i18n, is_chain, default_priority, category, ref_object_type)
  VALUES (gen_random_uuid(), v_tenant, 'Inquiry Response', '{"en":"Inquiry Response","de":"Anfrage-Antwort","nl":"Aanvraag Reactie"}', false, 2, 'sales', 'listing_inquiry')
  RETURNING id INTO t1;

  INSERT INTO op_task_template_steps (template_id, step_order, title, title_i18n, due_offset_hours, sla_offset_hours)
  VALUES (t1, 1, 'Respond to inquiry', '{"en":"Respond to inquiry","de":"Auf Anfrage antworten","nl":"Reageer op aanvraag"}', 2, 2);

  -- 2) Vehicle Intake Chain (5 chained steps)
  INSERT INTO op_task_templates (id, tenant_id, name, name_i18n, is_chain, default_priority, category, ref_object_type)
  VALUES (gen_random_uuid(), v_tenant, 'Vehicle Intake Chain', '{"en":"Vehicle Intake Chain","de":"Fahrzeugaufnahme-Kette","nl":"Voertuig Inname Keten"}', true, 2, 'operations', 'listing')
  RETURNING id INTO t2;

  INSERT INTO op_task_template_steps (template_id, step_order, title, title_i18n, due_offset_hours, sla_offset_hours, depends_on_prev)
  VALUES
    (t2, 1, 'Inspect vehicle condition', '{"en":"Inspect vehicle condition","de":"Fahrzeugzustand prüfen","nl":"Voertuigconditie inspecteren"}', 4, 8, false),
    (t2, 2, 'Take photos & upload', '{"en":"Take photos & upload","de":"Fotos machen & hochladen","nl":"Foto''s maken & uploaden"}', 8, 12, true),
    (t2, 3, 'Set pricing & margin', '{"en":"Set pricing & margin","de":"Preis & Marge festlegen","nl":"Prijs & marge instellen"}', 12, 24, true),
    (t2, 4, 'Create listing', '{"en":"Create listing","de":"Inserat erstellen","nl":"Advertentie aanmaken"}', 24, 36, true),
    (t2, 5, 'Publish to platforms', '{"en":"Publish to platforms","de":"Auf Plattformen veröffentlichen","nl":"Publiceer op platforms"}', 36, 48, true);

  -- 3) Invoice Reminder (1 step, 48h)
  INSERT INTO op_task_templates (id, tenant_id, name, name_i18n, is_chain, default_priority, category, ref_object_type)
  VALUES (gen_random_uuid(), v_tenant, 'Invoice Reminder', '{"en":"Invoice Reminder","de":"Rechnungserinnerung","nl":"Factuur Herinnering"}', false, 3, 'finance', 'fin_invoice')
  RETURNING id INTO t3;

  INSERT INTO op_task_template_steps (template_id, step_order, title, title_i18n, due_offset_hours, sla_offset_hours)
  VALUES (t3, 1, 'Send payment reminder', '{"en":"Send payment reminder","de":"Zahlungserinnerung senden","nl":"Betalingsherinnering sturen"}', 48, 72);

  -- 4) Support First Response (1 step, 4h SLA)
  INSERT INTO op_task_templates (id, tenant_id, name, name_i18n, is_chain, default_priority, category, ref_object_type)
  VALUES (gen_random_uuid(), v_tenant, 'Support First Response', '{"en":"Support First Response","de":"Erste Support-Antwort","nl":"Eerste Support Reactie"}', false, 1, 'support', 'sup_request')
  RETURNING id INTO t4;

  INSERT INTO op_task_template_steps (template_id, step_order, title, title_i18n, due_offset_hours, sla_offset_hours)
  VALUES (t4, 1, 'Respond to support request', '{"en":"Respond to support request","de":"Auf Supportanfrage antworten","nl":"Reageer op supportverzoek"}', 2, 4);

  -- 5) Review Follow-up (1 step, 24h)
  INSERT INTO op_task_templates (id, tenant_id, name, name_i18n, is_chain, default_priority, category, ref_object_type)
  VALUES (gen_random_uuid(), v_tenant, 'Review Follow-up', '{"en":"Review Follow-up","de":"Bewertungs-Nachverfolgung","nl":"Review Opvolging"}', false, 2, 'crm', 'review')
  RETURNING id INTO t5;

  INSERT INTO op_task_template_steps (template_id, step_order, title, title_i18n, due_offset_hours, sla_offset_hours)
  VALUES (t5, 1, 'Follow up on low review score', '{"en":"Follow up on low review score","de":"Niedrige Bewertung nachverfolgen","nl":"Lage review score opvolgen"}', 24, 48);

  RAISE NOTICE 'Seeded 5 templates: t1=%, t2=%, t3=%, t4=%, t5=%', t1, t2, t3, t4, t5;
END$$;
