/* LEEWAY HEADER
TAG: FRONTEND.COMPONENT.ERROR_MESSAGE
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_FAMILY: lucide
ICON_GLYPH: alert-triangle
ICON_SIG: CD534113
5WH: WHAT=Reusable inline error presentation; WHY=Consistent user feedback surface; WHO=Leeway Core (agnostic); WHERE=components/ErrorMessage.tsx; WHEN=2025-10-05; HOW=Lightweight functional React component
SPDX-License-Identifier: MIT
*/

import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="text-center font-medium text-red-800 py-4 my-4 bg-red-100 border border-red-300 rounded-md">
      {message}
    </div>
  );
};

export default ErrorMessage;
