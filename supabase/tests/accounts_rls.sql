-- RLS check for public.accounts. Runs as one DO block and always ends with an
-- exception, so every write is rolled back. Success message: 'ACCOUNTS_RLS_OK ...'.
-- Fixture ids are existing profiles: two reps and an admin on one team, and a rep
-- with no team. Replace them when running against another project.
DO $$
DECLARE
  rep_a   uuid := 'b9e957b5-f39e-4181-a676-02e21637f795';
  rep_b   uuid := 'ec3d187f-695d-43ea-8c13-e2eea5fedb54';
  admin_u uuid := 'e4a044b1-1264-4876-92d9-f544c78952cd';
  loner   uuid := '650458e4-e034-4af2-915c-925ae2feb42b';
  acct_a  uuid;
  n       int;
  got     uuid;
  failed  boolean;
  msgs    text[] := '{}';
BEGIN
  -- rep A inserts, trying to spoof rep_id and team_id; the trigger overrides both.
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', rep_a, 'role', 'authenticated')::text, true);
  INSERT INTO public.accounts (name, persona_id, rep_id, team_id)
  VALUES ('RLS test store', 'nh-liquor-store-owner', rep_a, NULL)
  RETURNING id INTO acct_a;
  SELECT rep_id INTO got FROM public.accounts WHERE id = acct_a;
  IF got IS DISTINCT FROM rep_a THEN RAISE EXCEPTION 'FAIL rep_id not forced'; END IF;
  SELECT count(*) INTO n FROM public.accounts WHERE id = acct_a AND team_id IS NOT NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL team_id not set from profile'; END IF;
  msgs := array_append(msgs, 'insert sets owner+team');

  -- rep A cannot move the account to rep B or another team.
  failed := false;
  BEGIN UPDATE public.accounts SET rep_id = rep_b WHERE id = acct_a; EXCEPTION WHEN insufficient_privilege OR check_violation THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL rep_id change allowed'; END IF;
  failed := false;
  BEGIN UPDATE public.accounts SET team_id = NULL WHERE id = acct_a; EXCEPTION WHEN insufficient_privilege THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL team_id change allowed'; END IF;
  UPDATE public.accounts SET notes = 'Prefers Tuesday deliveries' WHERE id = acct_a;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL owner cannot edit notes'; END IF;
  msgs := array_append(msgs, 'owner edits, owner/team locked');

  -- rep A can attach a session to their own account.
  INSERT INTO public.sessions (user_id, scenario_name, account_id) VALUES (rep_a::text, 'RLS test', acct_a);
  msgs := array_append(msgs, 'own session links');

  -- rep B (same team) can neither see nor edit nor link to rep A's account.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', rep_b, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO n FROM public.accounts WHERE id = acct_a;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL other rep can read'; END IF;
  UPDATE public.accounts SET notes = 'hijack' WHERE id = acct_a;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL other rep can update'; END IF;
  DELETE FROM public.accounts WHERE id = acct_a;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL other rep can delete'; END IF;
  failed := false;
  BEGIN INSERT INTO public.sessions (user_id, scenario_name, account_id) VALUES (rep_b::text, 'RLS test', acct_a);
  EXCEPTION WHEN insufficient_privilege THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL other rep can link a session to the account'; END IF;
  msgs := array_append(msgs, 'other rep blocked');

  -- the owner cannot delete either (no delete policy).
  PERFORM set_config('request.jwt.claims', json_build_object('sub', rep_a, 'role', 'authenticated')::text, true);
  DELETE FROM public.accounts WHERE id = acct_a;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL owner delete allowed'; END IF;

  -- admin/manager on the same team can read but not edit.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO n FROM public.accounts WHERE id = acct_a;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL team manager cannot read'; END IF;
  UPDATE public.accounts SET notes = 'manager edit' WHERE id = acct_a;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL manager can update'; END IF;
  msgs := array_append(msgs, 'team manager read-only');

  -- a rep with no team sees nothing.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', loner, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO n FROM public.accounts WHERE id = acct_a;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL unrelated rep can read'; END IF;

  -- anon has no table privileges at all.
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  failed := false;
  BEGIN SELECT count(*) INTO n FROM public.accounts; EXCEPTION WHEN insufficient_privilege THEN failed := true; END;
  IF NOT failed AND n <> 0 THEN RAISE EXCEPTION 'FAIL anon can read'; END IF;
  failed := false;
  BEGIN INSERT INTO public.accounts (name, persona_id, rep_id) VALUES ('anon', 'x', rep_a); EXCEPTION WHEN insufficient_privilege THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'FAIL anon can insert'; END IF;
  msgs := array_append(msgs, 'anon blocked');

  RAISE EXCEPTION 'ACCOUNTS_RLS_OK (rolled back): %', array_to_string(msgs, '; ');
END $$;
