import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // TODO: Implement Supabase authentication
    // const supabase = createRouteHandlerClient({ cookies })
    // const { data: { user }, error } = await supabase.auth.getUser()

    // if (error || !user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    // return NextResponse.json({ user }, { status: 200 })

    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { name, email } = await request.json()

    // TODO: Implement Supabase authentication and user update
    // const supabase = createRouteHandlerClient({ cookies })
    // const { data: { user }, error: userError } = await supabase.auth.getUser()

    // if (userError || !user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    // const { data, error } = await supabase.auth.updateUser({
    //   email,
    //   data: { name }
    // })

    // if (error) {
    //   return NextResponse.json({ error: error.message }, { status: 400 })
    // }

    return NextResponse.json(
      { message: 'User updated successfully', user: { name, email } },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}