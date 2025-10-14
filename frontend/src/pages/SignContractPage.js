import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import { CheckCircle, FileUp, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SignContractPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [step, setStep] = useState(1); // 1: View, 2: Upload, 3: Verify, 4: Success
  const [loading, setLoading] = useState(true);
  const [otpValue, setOtpValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [signatureHash, setSignatureHash] = useState('');

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      const response = await axios.get(`${API}/sign/${id}`);
      setContract(response.data);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post(`${API}/sign/${id}/upload-document`, formData);
      toast.success('Document uploaded');
      setStep(3);
      handleRequestOTP();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const handleRequestOTP = async (method = 'sms') => {
    try {
      const response = await axios.post(`${API}/sign/${id}/request-otp?method=${method}`);
      setMockOtp(response.data.mock_otp);
      toast.success(`OTP sent! Mock code: ${response.data.mock_otp}`);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) {
      toast.error('Please enter 6-digit code');
      return;
    }
    
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/sign/${id}/verify-otp`, {
        contract_id: id,
        phone: contract.signer_phone,
        otp_code: otpValue
      });
      
      if (response.data.signature_hash) {
        setSignatureHash(response.data.signature_hash);
      }
      
      toast.success(t('signing.success'));
      setStep(4);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card data-testid="sign-contract-card">
          <CardHeader>
            <CardTitle className="text-2xl" data-testid="signing-title">{t('signing.title')}</CardTitle>
            <p className="text-neutral-600">{contract.title}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: View Contract */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid="step-view-contract"
              >
                <div className="bg-neutral-50 p-4 rounded-lg border mb-6">
                  <pre className="whitespace-pre-wrap text-sm" data-testid="contract-preview">{contract.content}</pre>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  className="w-full"
                  data-testid="proceed-to-upload-button"
                >
                  Proceed to Verification
                </Button>
              </motion.div>
            )}

            {/* Step 2: Upload Document */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
                data-testid="step-upload-document"
              >
                <div className="text-center">
                  <FileUp className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('signing.upload_document')}</h3>
                  <p className="text-neutral-600 text-sm mb-4">Upload your ID or passport for verification</p>
                </div>
                
                <div>
                  <Label htmlFor="document" className="cursor-pointer">
                    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <Input
                        id="document"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        data-testid="document-upload-input"
                      />
                      <p className="text-sm text-neutral-600">
                        {uploading ? t('common.loading') : 'Click to upload or drag and drop'}
                      </p>
                    </div>
                  </Label>
                </div>
                
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="w-full"
                  data-testid="back-to-view-button"
                >
                  Back
                </Button>
              </motion.div>
            )}

            {/* Step 3: Verify OTP */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
                data-testid="step-verify-otp"
              >
                <div className="text-center">
                  <Phone className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('signing.verify_phone')}</h3>
                  <p className="text-neutral-600 text-sm mb-4">{t('signing.enter_otp')}</p>
                  {mockOtp && (
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
                      <p className="text-sm text-amber-900">Mock OTP Code: <strong>{mockOtp}</strong></p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={setOtpValue}
                    data-testid="otp-input"
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleRequestOTP('sms')}
                    className="text-sm text-primary hover:underline"
                    data-testid="resend-otp-link"
                  >
                    {t('signing.resend')}
                  </button>
                  <button
                    onClick={() => handleRequestOTP('call')}
                    className="text-sm text-neutral-600 hover:underline"
                    data-testid="call-option-link"
                  >
                    Call me instead
                  </button>
                </div>
                
                <Button
                  onClick={handleVerifyOTP}
                  disabled={verifying || otpValue.length !== 6}
                  className="w-full"
                  data-testid="otp-verify-button"
                >
                  {verifying ? t('common.loading') : t('signing.verify')}
                </Button>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
                data-testid="step-success"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">{t('signing.success')}</h3>
                <p className="text-neutral-600 mb-6">The contract creator will be notified and will review your signature.</p>
                
                {signatureHash && (
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 mb-4 max-w-md mx-auto">
                    <p className="text-sm text-emerald-900 mb-1 font-semibold">Код-ключ вашей подписи:</p>
                    <p className="text-lg font-mono text-emerald-900" data-testid="signature-hash-display">{signatureHash}</p>
                    <p className="text-xs text-emerald-700 mt-2">Сохраните этот код для подтверждения подлинности подписи</p>
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignContractPage;