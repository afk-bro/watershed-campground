-- =====================================================
-- Addons Table
-- =====================================================
-- Stores optional add-ons that guests can purchase with their reservation
-- (e.g., firewood, ice, kayak rentals, etc.)

CREATE TABLE addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_addons_category ON addons(category);
CREATE INDEX idx_addons_is_active ON addons(is_active);

-- RLS Policies (public read access, admin-only write)
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Addons are viewable by everyone"
    ON addons FOR SELECT
    USING (is_active = true);

CREATE POLICY "All addons are viewable by authenticated users"
    ON addons FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Addons are insertable by authenticated users only"
    ON addons FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Addons are updatable by authenticated users only"
    ON addons FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Addons are deletable by authenticated users only"
    ON addons FOR DELETE
    USING (auth.role() = 'authenticated');

-- =====================================================
-- Seed Data: Sample Addons
-- =====================================================

INSERT INTO addons (name, description, price, category, is_active)
VALUES
    ('Firewood Bundle', 'Seasoned firewood bundle for your campfire', 8.00, 'Camping Essentials', true),
    ('Ice (10 lbs)', 'Bag of ice to keep your cooler cold', 5.00, 'Camping Essentials', true),
    ('Kayak Rental (Full Day)', 'Single kayak rental for a full day', 35.00, 'Water Activities', true),
    ('Paddleboard Rental (Full Day)', 'Stand-up paddleboard rental for a full day', 40.00, 'Water Activities', true),
    ('Fishing Rod Rental', 'Fishing rod and tackle rental for your stay', 15.00, 'Water Activities', true),
    ('Extra Parking Pass', 'Additional vehicle parking pass', 10.00, 'Services', true),
    ('Early Check-in', 'Check in 3 hours early (subject to availability)', 25.00, 'Services', true),
    ('Late Checkout', 'Check out 2 hours late (subject to availability)', 20.00, 'Services', true);

-- Add a comment for documentation
COMMENT ON TABLE addons IS 'Optional add-ons that guests can purchase with their campground reservation';
