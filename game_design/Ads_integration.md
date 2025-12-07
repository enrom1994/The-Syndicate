You are hitting on a very important point. In the "Tap-to-Earn" or Telegram gaming space, **Ad Rewards** are the primary revenue driver.

The dominant player in this specific niche right now is **Adsgram** (backed by the TON foundation). It is built specifically for Telegram Mini Apps. Google AdMob does *not* work well here because Mini Apps are websites, not native Android/iOS apps.

Here is how we think about this architecture using **Supabase** to ensure users don't cheat.

### The "Don't Trust the Client" Rule

If you only handle this in your frontend JavaScript code (e.g., `if (adFinished) giveCoins()`), hackers will simply open their browser console, find that function, and trigger it 1,000 times without watching a single ad.

You must use **Server-Side Verification (SSV)**.

### The Architecture

1.  **Frontend:** The user clicks "Watch Ad". You call the Adsgram SDK.
2.  **Ad Network:** The user watches the video.
3.  **Ad Network (Server):** When the video finishes, Adsgram's server sends a secret "Webhook" (a POST request) to your **Supabase Edge Function**.
4.  **Supabase Edge Function:**
      * Verifies the request is actually from Adsgram (using a secret key).
      * Updates the user's balance in your database.
5.  **Frontend:** You listen for the balance update via Supabase Realtime (or just refresh the balance) to show the user they got paid.

-----

### Step 1: The Database Schema

You need a place to log these transactions so you can limit them (e.g., "Max 10 ads per day").

**Table:** `public.ad_views`

  * `id`: uuid
  * `user_id`: uuid (Link to `auth.users` or your profiles table)
  * `ad_network_id`: text (The unique ID sent by the ad network)
  * `reward_amount`: int
  * `created_at`: timestamp

**Table Update:** `public.profiles`

  * Add column `coins` (int)

-----

### Step 2: The Frontend (The Trigger)

First, you sign up for Adsgram and get your Block ID.

```javascript
// Inside your frontend code (e.g., React/Vanilla JS)
// You must load the Adsgram script in your index.html first

const AdController = window.Adsgram.init({ blockId: "YOUR_BLOCK_ID" });

function watchAdForReward() {
  AdController.show().then((result) => {
    // result.done is true if they watched it.
    // BUT: Don't reward them here! 
    // Just show a "Processing..." spinner.
    // The real reward comes via the background webhook.
    if (result.done) {
      console.log("Ad watched, waiting for server verification...");
    }
  }).catch((result) => {
    // Handle error or skipped video
    console.log("Ad skipped or error");
  });
}
```

-----

### Step 3: The Backend (Supabase Edge Function)

This is the most critical part. You need an Edge Function to receive the ping from Adsgram.

Create a function: `supabase functions new ad-webhook`

**The Logic (Pseudo-code for Deno/Typescript):**

```typescript
// supabase/functions/ad-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // 1. Check if the request is legitimate
  // Adsgram will send a specific query parameter or header with a signature
  const url = new URL(req.url);
  const key = url.searchParams.get('key'); // You set this "secret key" in Adsgram dashboard
  
  if (key !== Deno.env.get('ADSGRAM_SECRET_KEY')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parse the body
  // Adsgram sends user ID and type of reward
  const { userid, type, reward } = await req.json();

  // 3. Init Supabase Admin (Bypass RLS to update user balance)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // 4. Update the User's Balance
  // It is safer to use an RPC (Database Function) for this to handle concurrency
  const { error } = await supabase.rpc('increment_coins', { 
    user_id_input: userid, 
    amount: 100 // or whatever the reward is
  });

  if (error) {
    return new Response('Error updating balance', { status: 500 });
  }

  // 5. Log the view (Optional but recommended for analytics)
  await supabase.from('ad_views').insert({
    user_id: userid,
    ad_network_reference: type // or transaction ID from ad network
  });

  return new Response('OK', { status: 200 });
})
```

### Step 4: The Security Layer (Postgres RPC)

Instead of running SQL directly in the Edge Function, create a Database Function (RPC) in Supabase. This ensures two ads finishing at the exact same millisecond don't mess up the balance.

Go to Supabase Dashboard -\> SQL Editor:

```sql
create or replace function increment_coins(user_id_input uuid, amount int)
returns void as $$
begin
  update public.profiles
  set coins = coins + amount
  where id = user_id_input;
end;
$$ language plpgsql security definer;
```

### Summary of the "Mental Model"

1.  **Don't rely on the phone:** The phone is just a TV screen. It shows the ad.
2.  **Rely on the "Server-to-Server" call:** The Ad Network talks to your Supabase Database directly.
3.  **Realtime feedback:** Since Supabase has "Realtime" features, the moment the Edge Function updates the database, your frontend can auto-update the coin counter without the user refreshing.

**Would you like me to detail how to set up the "Realtime" listener on the frontend so the coins update automatically after the ad?**