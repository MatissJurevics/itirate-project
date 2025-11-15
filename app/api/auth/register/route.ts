import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // TODO: Implement Supabase authentication
    // const supabase = createRouteHandlerClient({ cookies })
    // const { data, error } = await supabase.auth.signUp({
    //   email,
    //   password,
    //   options: {
    //     data: {
    //       name,
    //     }
    //   }
    // })

    // if (error) {
    //   return NextResponse.json({ error: error.message }, { status: 400 })
    // }

    return NextResponse.json(
      { message: 'Registration successful', user: { email, name } },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}