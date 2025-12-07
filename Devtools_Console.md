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
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent viewport_changed {width: 430, height: 875, is_expanded: true, is_state_stable: true}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent content_safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_ready 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_expand 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_ready 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_expand 
telegram-web-app.js:135 [Telegram.WebView] > postEvent web_app_setup_back_button {is_visible: false}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent theme_changed {theme_params: {…}}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent viewport_changed {width: 430, height: 875, is_expanded: true, is_state_stable: true}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent content_safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent content_safe_area_changed {left: 0, right: 0, top: 0, bottom: 0}
index-6MCma5FO.js:1653 [Auth] Telegram WebApp: true
index-6MCma5FO.js:1653 [Auth] initData present: true
index-6MCma5FO.js:1653 [Auth] initData length: 597
index-6MCma5FO.js:1653 [Auth] initDataUnsafe.user: {id: 7058432307, first_name: 'Kwaad', last_name: 'Juice', username: 'Kwaad_Juice_TG', language_code: 'en', …}
index-6MCma5FO.js:1653 [Auth] Calling Edge Function via supabase.functions.invoke...
telegram-web-app.js:162 [Telegram.WebView] < receiveEvent visibility_changed {is_visible: true}
index-6MCma5FO.js:1636  POST https://giwolutowfkvkcxlcwus.supabase.co/functions/v1/telegram-auth 500 (Internal Server Error)
(anonymous) @ index-6MCma5FO.js:1636
(anonymous) @ index-6MCma5FO.js:1636
await in (anonymous)
(anonymous) @ index-6MCma5FO.js:1611
(anonymous) @ index-6MCma5FO.js:1611
(anonymous) @ index-6MCma5FO.js:1611
Se @ index-6MCma5FO.js:1611
invoke @ index-6MCma5FO.js:1611
(anonymous) @ index-6MCma5FO.js:1653
(anonymous) @ index-6MCma5FO.js:1653
await in (anonymous)
(anonymous) @ index-6MCma5FO.js:1653
Gm @ index-6MCma5FO.js:40
ac @ index-6MCma5FO.js:40
m5 @ index-6MCma5FO.js:40
pa @ index-6MCma5FO.js:38
xM @ index-6MCma5FO.js:40
ka @ index-6MCma5FO.js:40
k_ @ index-6MCma5FO.js:40
E @ index-6MCma5FO.js:25
I @ index-6MCma5FO.js:25Understand this error
index-6MCma5FO.js:1653 [Auth] Function invocation error: FunctionsHttpError: Edge Function returned a non-2xx status code
    at iX.<anonymous> (index-6MCma5FO.js:1611:92719)
    at Generator.next (<anonymous>)
    at a (index-6MCma5FO.js:1611:82203)
(anonymous) @ index-6MCma5FO.js:1653
await in (anonymous)
(anonymous) @ index-6MCma5FO.js:1653
await in (anonymous)
(anonymous) @ index-6MCma5FO.js:1653
Gm @ index-6MCma5FO.js:40
ac @ index-6MCma5FO.js:40
m5 @ index-6MCma5FO.js:40
pa @ index-6MCma5FO.js:38
xM @ index-6MCma5FO.js:40
ka @ index-6MCma5FO.js:40
k_ @ index-6MCma5FO.js:40
E @ index-6MCma5FO.js:25
I @ index-6MCma5FO.js:25Understand this error
index-6MCma5FO.js:1653 [Auth] Error details: {"name":"FunctionsHttpError","context":{}}
index-6MCma5FO.js:1653 Login error: FunctionsHttpError: Edge Function returned a non-2xx status code
    at iX.<anonymous> (index-6MCma5FO.js:1611:92719)
    at Generator.next (<anonymous>)
    at a (index-6MCma5FO.js:1611:82203)