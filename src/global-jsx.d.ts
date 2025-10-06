// Workaround: Ensure JSX namespace is available if React automatic runtime not picked up
// Remove this once root cause of missing intrinsic elements is resolved.
import 'react';
import type * as ReactNamespace from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ReactNamespace.JSX.IntrinsicElements {}
  }
}
