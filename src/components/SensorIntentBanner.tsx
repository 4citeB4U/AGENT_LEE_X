/* LEEWAY HEADER
TAG: FRONTEND.CONSENT.BANNER
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { getConsent, log, setConsent } from '../lib/consent/store';

export default function SensorIntentBanner(){
  const [visible, setVisible] = React.useState(()=>{
    const c = getConsent();
    return !(c.mic && c.camera)
  })

  if(!visible) return null
  return (
    <div className="w-full bg-amber-900/40 border border-amber-700 text-amber-200 text-sm px-3 py-2 flex items-center justify-between">
      <div>
        Sensor intent: This app can use your microphone and camera for voice/vision features. Grant only if you agree.
      </div>
      <div className="flex gap-2">
        <button className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded" onClick={()=>{ setConsent({ mic:true, camera:true }); log('mic', true); log('camera', true); setVisible(false) }}>Allow</button>
        <button className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" onClick={()=>{ log('dismiss', true); setVisible(false) }}>Dismiss</button>
      </div>
    </div>
  )
}
