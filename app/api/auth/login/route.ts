import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // TODO: Implement Supabase authentication
    // const supabase = createRouteHandlerClient({ cookies })
    // const { data, error } = await supabase.auth.signInWithPassword({
    //   email,
    //   password,
    // })

    // if (error) {
    //   return NextResponse.json({ error: error.message }, { status: 400 })
    // }

    return NextResponse.json(
      { message: 'Login successful', user: { email } },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}