-- 0014 — New accounts can start as a fruit too.
--
-- The default avatar was drawn from the eight people (0010). It now draws
-- from all twenty: the people and the twelve fruity characters
-- (src/components/avatarsFruit.tsx). Existing accounts keep what they have;
-- a column default only applies to rows inserted from here on.

alter table public.profiles
  alter column avatar_preset set default
    (array[
      'wrap','afro','fade','braids','hijab','bun','locs','elder',
      'mango','pineapple','orange','watermelon','avocado','coconut',
      'strawberry','lemon','grapes','cocoa','apple','capsule'
    ])[floor(random() * 20)::int + 1];
