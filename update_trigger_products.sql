-- Create a function to handle new user registration including profile and products
create or replace function public.handle_new_user()
returns trigger as $$
declare
  product_id_val uuid;
  product_item jsonb;
begin
  -- 1. Create Profile
  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    'agent' -- Default role
  );

  -- 2. Insert Products if provided in metadata
  -- Expecting 'products' to be a JSON array of ID strings ["uuid1", "uuid2"]
  if new.raw_user_meta_data->'products' is not null then
    
    -- Iterate through the JSON array
    for product_item in select * from jsonb_array_elements(new.raw_user_meta_data->'products')
    loop
      -- Extract UUID (handle pure text)
      product_id_val := (product_item#>>'{}')::uuid;

      begin
        insert into public.user_products (user_id, product_id)
        values (new.id, product_id_val);
      exception when others then
        -- Ignore errors (e.g. invalid UUIDs or duplicates) to prevent registration failure
        raise warning 'Failed to insert product: %', product_id_val;
      end;
    end loop;
  end if;

  return new;
end;
$$ language plpgsql security definer;
