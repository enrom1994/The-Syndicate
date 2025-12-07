[Telegram.WebView] > postEvent web_app_set_header_color {color_key: 'bg_color'}
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_set_background_color {color: '#212121'}
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_set_bottom_bar_color {color: '#0f0f0f'}
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_request_theme 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_request_viewport 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_request_safe_area 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_request_content_safe_area 
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent theme_changed {theme_params: {…}}
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_setup_main_button {is_visible: false}
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_setup_secondary_button {is_visible: false}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent viewport_changed {width: 430, height: 875, is_expanded: true, is_state_stable: true}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent content_safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent content_safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent visibility_changed {is_visible: true}
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_ready 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_expand 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_ready 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_expand 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_setup_back_button {is_visible: false}
index-a0R5tyso.js:1653 [Auth] Telegram WebApp: true
index-a0R5tyso.js:1653 [Auth] initData present: true
index-a0R5tyso.js:1653 [Auth] initData length: 580
index-a0R5tyso.js:1653 [Auth] initDataUnsafe.user: {id: 7058432307, first_name: 'Kwaad', last_name: 'Juice', username: 'Kwaad_Juice_TG', language_code: 'en', …}
index-a0R5tyso.js:1653 [Auth] Calling Edge Function via supabase.functions.invoke...
index-a0R5tyso.js:1653 [Auth] Edge Function success, data: {token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhd…zMCJ9.5wRliorHXj7sCMu8_KFhbZuKnpQxFwMUp4w3NM87KK4', user: {…}, player: {…}, isNewUser: true}
index-a0R5tyso.js:1637  GET https://giwolutowfkvkcxlcwus.supabase.co/auth/v1/user 403 (Forbidden)
(anonymous) @ index-a0R5tyso.js:1637
Ree @ index-a0R5tyso.js:1637
qe @ index-a0R5tyso.js:1637
_getUser @ index-a0R5tyso.js:1653
_setSession @ index-a0R5tyso.js:1653
(anonymous) @ index-a0R5tyso.js:1653
(anonymous) @ index-a0R5tyso.js:1653
(anonymous) @ index-a0R5tyso.js:1637Understand this error
index-a0R5tyso.js:1653 [Auth] Failed to set session via Supabase client (likely 403 restricted): AuthSessionMissingError: Auth session missing!
    at VC (index-a0R5tyso.js:1637:8175)
    at async Ree (index-a0R5tyso.js:1637:9452)
    at async qe (index-a0R5tyso.js:1637:9110)
    at async lte._getUser (index-a0R5tyso.js:1653:9544)
    at async lte._setSession (index-a0R5tyso.js:1653:11646)
    at async index-a0R5tyso.js:1653:11209