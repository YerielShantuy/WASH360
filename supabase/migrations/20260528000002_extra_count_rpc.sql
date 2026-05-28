-- Atomically increments extra_submissions_count on a bingo card.
-- The CHECK (extra_submissions_count <= 5) constraint on the table will reject
-- a 6th increment at the DB level.
CREATE OR REPLACE FUNCTION increment_extra_count(p_card_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bingo_cards
  SET extra_submissions_count = extra_submissions_count + 1
  WHERE id = p_card_id
    AND user_id = auth.uid();
END;
$$;
