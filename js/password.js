const { data, error } = await supabase.auth.resetPasswordForEmail(
    'gfernandez.cp@gmail.com',
    { redirectTo: 'https://greht.github.io/index.html' } // URL de tu app
)