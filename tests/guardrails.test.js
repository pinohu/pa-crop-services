// PA CROP Services — Chatbot Guardrails Unit Tests
// Tests intent classification and legal boundary enforcement.
// Critical: misclassifying LEGAL_QUESTION as COMPLIANCE_FACT could result
// in the chatbot providing legal advice it is not qualified to give.
//
// Run: node --test tests/guardrails.test.js

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  classifyIntent,
  shouldRefuse,
  buildRefusalResponse,
  buildGuardrailInstructions
} from '../api/_guardrails.js';

describe('classifyIntent', () => {
  describe('COMPLIANCE_FACT', () => {
    const complianceFacts = [
      'When is my annual report due?',
      'What is the deadline for my LLC?',
      'How much does the annual report filing cost?',
      'What is the fee for filing?',
      'What happens if I miss my filing deadline?',
      'Can I reinstate my dissolved LLC?',
      'What is a CROP?',
      'What is a commercial registered office provider?',
      'How do I change my registered office?',
    ];

    for (const msg of complianceFacts) {
      test(`classifies as COMPLIANCE_FACT: "${msg}"`, () => {
        assert.equal(classifyIntent(msg), 'COMPLIANCE_FACT');
      });
    }
  });

  describe('LEGAL_QUESTION', () => {
    const legalQuestions = [
      'Should I sue my business partner?',
      'Am I liable for my LLC debts?',
      'What are my legal rights?',
      'Can I be sued for this?',
      'What is the meaning of this statute?',
      'Is it legal to do this?',
      'I need legal advice about my contract',
      'What are my tax deductions?',
      'Can I deduct this expense?',
    ];

    for (const msg of legalQuestions) {
      test(`classifies as LEGAL_QUESTION: "${msg}"`, () => {
        assert.equal(classifyIntent(msg), 'LEGAL_QUESTION');
      });
    }
  });

  describe('ACTION_REQUEST', () => {
    const actions = [
      'How do I upload a document?',
      'Can I upgrade my plan?',
      'Show my entities',
      'How do I change my plan?',
    ];

    for (const msg of actions) {
      test(`classifies as ACTION_REQUEST: "${msg}"`, () => {
        assert.equal(classifyIntent(msg), 'ACTION_REQUEST');
      });
    }
  });

  describe('BILLING_QUESTION', () => {
    const billing = [
      'How much does your service cost?',
      'What is the difference between plans?',
      'I want to cancel my subscription',
      'Can I get a refund?',
    ];

    for (const msg of billing) {
      test(`classifies as BILLING_QUESTION: "${msg}"`, () => {
        assert.equal(classifyIntent(msg), 'BILLING_QUESTION');
      });
    }
  });

  describe('edge cases', () => {
    test('returns GENERAL_QUESTION for empty string', () => {
      assert.equal(classifyIntent(''), 'GENERAL_QUESTION');
    });

    test('returns GENERAL_QUESTION for null', () => {
      assert.equal(classifyIntent(null), 'GENERAL_QUESTION');
    });

    test('returns GENERAL_QUESTION for undefined', () => {
      assert.equal(classifyIntent(undefined), 'GENERAL_QUESTION');
    });

    test('returns GENERAL_QUESTION for ambiguous message', () => {
      assert.equal(classifyIntent('Hello there'), 'GENERAL_QUESTION');
    });
  });
});

describe('shouldRefuse', () => {
  test('refuses LEGAL_QUESTION', () => {
    assert.equal(shouldRefuse('LEGAL_QUESTION'), true);
  });

  const nonRefused = ['COMPLIANCE_FACT', 'ACTION_REQUEST', 'BILLING_QUESTION', 'ONBOARDING_HELP', 'GENERAL_QUESTION'];
  for (const intent of nonRefused) {
    test(`does not refuse ${intent}`, () => {
      assert.equal(shouldRefuse(intent), false);
    });
  }
});

describe('buildRefusalResponse', () => {
  test('returns an object with answer, sources, and confidence', () => {
    const refusal = buildRefusalResponse();
    assert.ok(typeof refusal.answer === 'string', 'missing answer');
    assert.ok(Array.isArray(refusal.sources), 'sources should be array');
    assert.equal(typeof refusal.confidence, 'number', 'confidence should be number');
    assert.equal(refusal.confidence, 1.0, 'refusal confidence should be 1.0');
  });

  test('refusal answer mentions attorney or CPA', () => {
    const refusal = buildRefusalResponse();
    const lowerAnswer = refusal.answer.toLowerCase();
    assert.ok(
      lowerAnswer.includes('attorney') || lowerAnswer.includes('cpa') || lowerAnswer.includes('lawyer'),
      'refusal should reference legal/tax professional'
    );
  });

  test('refusal answer does not claim to give legal advice', () => {
    const refusal = buildRefusalResponse();
    assert.ok(!refusal.answer.toLowerCase().includes('legal advice is'), 'should not claim to give legal advice');
  });
});

describe('buildGuardrailInstructions', () => {
  test('returns non-empty string', () => {
    const instructions = buildGuardrailInstructions();
    assert.ok(typeof instructions === 'string');
    assert.ok(instructions.length > 50, 'instructions should be substantial');
  });

  test('includes citation requirement', () => {
    const instructions = buildGuardrailInstructions();
    assert.ok(instructions.toUpperCase().includes('CITATION') || instructions.includes('[Rules:'), 'should require citations');
  });

  test('includes legal boundary enforcement', () => {
    const instructions = buildGuardrailInstructions();
    assert.ok(
      instructions.includes('legal advice') || instructions.includes('attorney') || instructions.includes('LEGAL'),
      'should enforce legal boundary'
    );
  });
});
