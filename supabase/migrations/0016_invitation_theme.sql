-- Add invitation_theme column to couples table
-- Supported values: 'classic' | 'dark_luxury' | 'blush' | 'minimal'
alter table couples
  add column if not exists invitation_theme text not null default 'dark_luxury';
