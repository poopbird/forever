-- Add dot_emoji column so each memory can have a personalised timeline dot icon
alter table memories add column if not exists dot_emoji text;
