-- Add N26 to the companies table with real discovered career page URL
INSERT INTO public.companies (
  id, 
  name, 
  description, 
  industry, 
  size_category, 
  website_url, 
  careers_url, 
  headquarters, 
  founded_year
) VALUES (
  '550e8400-e29b-41d4-a716-446655440011', 
  'N26', 
  'Digital bank offering mobile banking services across Europe and the US with innovative financial products', 
  'Fintech', 
  'large', 
  'https://n26.com', 
  'https://n26.com/en/careers', 
  'Berlin, Germany', 
  2013
);