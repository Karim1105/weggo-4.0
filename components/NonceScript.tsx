import { getCspNonce } from '@/lib/csp'

type NonceScriptProps = Omit<React.ScriptHTMLAttributes<HTMLScriptElement>, 'nonce' | 'children' | 'dangerouslySetInnerHTML'> & {
  /** Inline code to run. Never interpolate user input into it unescaped. */
  code?: string
}

/**
 * The only sanctioned way to render a <script> tag (enforced by ESLint).
 * It attaches this request's CSP nonce so the browser will execute it.
 */
export default async function NonceScript({ code, ...props }: NonceScriptProps) {
  const nonce = await getCspNonce()
  // eslint-disable-next-line no-restricted-syntax -- this component is the sanctioned wrapper
  return <script {...props} nonce={nonce} dangerouslySetInnerHTML={code ? { __html: code } : undefined} />
}
