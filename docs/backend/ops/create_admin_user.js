// Create admin user properly using Supabase Admin API
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  console.log('URL:', supabaseUrl)
  console.log('Has key:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@test.com',
    password: 'admin123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Admin'
    }
  })

  if (error) {
    console.error('Error creating admin user:', error)
    process.exit(1)
  }

  console.log('✅ Admin user created successfully!')
  console.log('   Email: admin@test.com')
  console.log('   Password: admin123')
  console.log('   User ID:', data.user.id)
}

createAdminUser()
