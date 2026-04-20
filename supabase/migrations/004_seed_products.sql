insert into public.products (
  name,
  slug,
  description,
  price,
  image_url,
  ingredients,
  is_available
)
values
  (
    'Serious Choc Chip',
    'serious-choc-chip',
    'The Serious Series classic loaded with crunchy chocolate chips.',
    5.90,
    null,
    'Flour, butter, sugar, eggs, chocolate chips, vanilla, sea salt',
    true
  ),
  (
    'The Cyborg',
    'the-cyborg',
    'Macadamia and white chocolate fusion with a bold manga crunch.',
    6.40,
    null,
    'Flour, butter, sugar, eggs, macadamia nuts, white chocolate, vanilla',
    true
  ),
  (
    'The Dark Matter',
    'the-dark-matter',
    'Double dark chocolate sea salt cookie for intense cocoa fans.',
    6.20,
    null,
    'Flour, butter, sugar, dark cocoa, dark chocolate, sea salt, eggs',
    true
  ),
  (
    'The Sidekick',
    'the-sidekick',
    'Bite-sized crumb and end pieces, perfect as snackable add-ons.',
    3.50,
    null,
    'Mixed cookie crumb pieces from daily bakes',
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  ingredients = excluded.ingredients,
  is_available = excluded.is_available;
