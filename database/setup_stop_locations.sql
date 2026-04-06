-- Stop Locations Table
-- Stores latitude and longitude for each route stop.
-- Foreign key links to the route_stops table.

CREATE TABLE IF NOT EXISTS stop_locations (
    id SERIAL PRIMARY KEY,
    route_stop_id INT NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    UNIQUE(route_stop_id)
);

-- Template insert for Bus 1 (Route 1) stops
-- Please replace the 0.0 values with the actual coordinates you have.
INSERT INTO stop_locations (route_stop_id, latitude, longitude) VALUES
(1, 0.0, 0.0),  -- Karunagapally
(2, 0.0, 0.0),  -- Kuttivattom
(3, 0.0, 0.0),  -- Edapallykkotta
(4, 0.0, 0.0),  -- Sangaramangalam
(5, 0.0, 0.0),  -- Chavara
(6, 0.0, 0.0),  -- Neendakara
(7, 0.0, 0.0),  -- Shakthikulangara
(8, 0.0, 0.0),  -- Kavanadu
(9, 0.0, 0.0),  -- Kadavoor
(10, 0.0, 0.0), -- College Of Engineering Perumon

(11, 8.99822, 76.74002), -- Neduvathoor
(12, 8.98724, 76.73603), -- Ambalathumkala
(13, 8.98038, 76.71144), -- Ezhukone
(14, 8.93853, 76.67925), -- Perumpuzha
(15, 8.93942, 76.65577), -- Keralapuram
(16, 8.965496, 76.617311), -- College Of Engineering Perumon

(17, 9.00441, 76.77334), -- Kottarakkara
(18, 9.00252, 76.76791), -- Kottarakkara Railway Station
(19, 8.977143, 76.703721), -- Nedumpayikkulam
(20, 8.96143, 76.68285), -- Kundara
(21, 8.95170, 76.65241), -- Vellimon
(22, 8.949255, 76.647915), -- Cherumoodu
(23, 8.965496, 76.617311), -- College Of Engineering Perumon

(24, 8.86552, 76.67354), -- Kottiyam
(25, 8.86523, 76.65350), -- Umayanalloor
(26, 8.87621, 76.62234), -- Pallimukku
(27, 8.87837, 76.60861), -- Polayathodu
(28, 8.88537, 76.58960), -- Chinnakkada
(29, 8.965496, 76.617311), -- College Of Engineering Perumon

(30, 8.80832, 76.66998), -- Paravoor
(31, 8.83754, 76.68612), -- Nedumgolam
(32, 8.86175, 76.70551), -- Thirumukku
(33, 8.90305, 76.62367), -- Kallumthazham
(34, 8.90915, 76.62488), -- Moonamkutty
(35, 8.91670, 76.63256), -- Karicode
(36, 8.93052, 76.63831), -- Chandanathope
(37, 8.965496, 76.617311), -- College Of Engineering Perumon

(38,8.86807, 76.64479), -- Mevarom
(39,8.87214, 76.63814 ), --Thattamala
(40,8.87625, 76.61526), -- Madanada
(41,8.879973, 76.604587), -- College Junction
(42,8.885315, 76.594555), -- Kollam Railway Station
(43,8.89279, 76.57848), -- High School Junction
(44. 8.965496, 76.617311), -- College Of Engineering Perumon

(45, 8.81358, 76.75791); -- Paripally
(46. 8.83340, 76.74450), -- Kalluvathukal
(47. 8.85111, 76.73169), -- Karamcode
(48. 8.86357, 76.71178), -- Chathannoor
(49. 8.86302, 76.69590), -- Ithikkara
(50. 8.87837, 76.63923), -- Palathara
(51. 8.88393, 76.63492), -- SN Public School
(52. 8.90744, 76.62058), -- Mangad
(53. 8.93192, 76.60352), -- Anchalumoodu
(54. 8.965496, 76.617311); -- College Of Engineering Perumon