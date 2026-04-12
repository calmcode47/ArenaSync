"""
Integration smoke tests — verify the complete API surface is reachable.
These run AFTER unit tests and require a live database + redis connection.
Mark with @pytest.mark.integration so they can be skipped in CI with -m "not integration".

TEST CASES:

test_health_endpoint:
  GET /health → 200, {"status": "ok"}

test_auth_flow:
  1. POST /auth/register → 201 (new user)
  2. POST /auth/login → 200, access_token present
  3. GET /auth/me (with token) → 200, email matches

test_venue_crud:
  POST /maps/venue/{known_venue_id}/details → 200 (requires GOOGLE_MAPS_API_KEY in env)
  If no API key: skip with pytest.skip("No Google Maps key")

test_crowd_pipeline:
  1. POST /crowd/snapshot (staff token) → 201
  2. GET /crowd/venue/{venue_id}/summary → 200, VenueCrowdSummary shape
     Assert: "zones" key exists, "total_current_count" is int
  3. GET /crowd/venue/{venue_id}/heatmap → 200, "points" key exists

test_queue_pipeline:
  1. POST /queue/record (staff token) → 201
  2. GET /queue/venue/{venue_id}/summary → 200
     Assert: "zones" key exists, "worst_zone_id" key exists
  3. GET /queue/zone/{zone_id}/prediction → 200
     Assert: "estimated_wait_minutes" key is float

test_alert_lifecycle:
  1. POST /alerts/create (staff token) → 201
     Assert: "translated_messages" key exists (auto-translation happened)
     Assert: "id" is present
  2. GET /alerts/venue/{venue_id} → 200, list contains the created alert
  3. PATCH /alerts/{alert_id}/resolve → 200, is_resolved=True

test_virtual_queue_flow:
  1. POST /vqueue/join (attendee token, zone_id) → 201
     Assert: "ticket_code" present (6 chars), "position" = 1
  2. GET /vqueue/status/{ticket_code} → 200
     Assert: "people_ahead" = 0 (we are first)
  3. POST /vqueue/call-next (staff token, zone_id) → 200
     Assert: returned ticket_code matches our ticket
  4. DELETE /vqueue/abandon/{ticket_code} → 204

test_websocket_connection:
  Use httpx-ws or websockets library to test WS handshake:
  Connect to ws://localhost:8000/ws/{venue_id}?token={valid_token}
  Expect: initial_state message received within 2 seconds
  Assert: message has "event" = "initial_state", "data.crowd" exists

test_translation_endpoint:
  POST /translate/text { text: "Gate is now open", target_lang: "es" } → 200
  Assert: "translated_text" key in response, value is non-empty string
"""
