export function isServicePaused() {
  return process.env.SERVICE_PAUSED !== 'false';
}

export function sendPausedResponse(res) {
  res.setHeader('Retry-After', '86400');
  return res.status(503).json({
    success: false,
    error: 'service_paused',
    message: 'PA CROP Services is temporarily paused while payment confirmation and account setup are reviewed. No new purchases, upgrades, or onboarding submissions are being accepted right now. Please contact hello@pacropservices.com or call 814-228-2822 for help with an existing account.'
  });
}
