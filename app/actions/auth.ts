'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateNavbar() {
  // Revalidate the navbar cache so it refreshes on next render
  revalidatePath('/', 'layout')
}
