const express = require('express');
const { authenticateToken } = require('./auth');
const { getUser, upgradeUserPlan } = require('../utils/database');

const router = express.Router();

// Get pricing plans
router.get('/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: null,
        analyses_limit: 3,
        features: [
          '3 free analyses',
          'Basic compliance insights',
          'Email support'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        analyses_limit: 100,
        features: [
          '100 analyses per month',
          'Detailed compliance reports',
          'Priority support',
          'Analysis history',
          'Export reports'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 29.99,
        currency: 'USD',
        interval: 'month',
        analyses_limit: 1000,
        features: [
          '1000 analyses per month',
          'Advanced compliance insights',
          'Custom integrations',
          '24/7 support',
          'Team management',
          'API access'
        ]
      }
    ]
  });
});

// Create payment session (placeholder for Stripe integration)
router.post('/create-session', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.userId;

    // Validate plan
    const validPlans = ['pro', 'enterprise'];
    if (!validPlans.includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // For now, simulate payment success
    // In production, this would integrate with Stripe or another payment processor
    
    // Simulate payment session
    const sessionId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      sessionId,
      checkoutUrl: `https://your-payment-provider.com/checkout/${sessionId}`,
      message: 'Payment session created successfully'
    });

  } catch (error) {
    console.error('Payment session error:', error);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

// Handle successful payment (webhook endpoint)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // This would normally verify the webhook signature from your payment provider
    
    const event = JSON.parse(req.body);
    
    if (event.type === 'payment_succeeded') {
      const { userId, planId } = event.data;
      
      // Upgrade user's plan
      const newLimit = planId === 'pro' ? 100 : 1000;
      await upgradeUserPlan(userId, planId, newLimit);
      
      console.log(`User ${userId} upgraded to ${planId} plan`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Get user's billing info
router.get('/billing', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await getUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      plan: user.plan,
      analysesUsed: user.analysesUsed,
      analysesLimit: user.analysesLimit,
      billingCycle: user.billingCycle || null,
      nextBillingDate: user.nextBillingDate || null,
      status: user.subscriptionStatus || 'active'
    });

  } catch (error) {
    console.error('Billing info error:', error);
    res.status(500).json({ error: 'Failed to retrieve billing information' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // In production, this would cancel the subscription with the payment provider
    // For now, we'll just downgrade to free plan at the end of billing cycle
    
    res.json({
      message: 'Subscription cancelled successfully',
      note: 'Your subscription will remain active until the end of the current billing period'
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;