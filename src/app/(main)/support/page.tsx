'use client';

import { Mail, MessageCircle, HelpCircle, Shield, DollarSign, Image } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Support Center</h1>
          <p className="text-muted-foreground text-lg">
            We're here to help! Get answers to common questions or reach out directly.
          </p>
        </div>

        {/* Contact Card */}
        <div className="bg-card border rounded-lg p-8 mb-12 text-center">
          <Mail className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-semibold mb-2">Get in Touch</h2>
          <p className="text-muted-foreground mb-4">
            Have a question or need assistance? Our team is ready to help.
          </p>
          <a
            href="mailto:Support@gouache.art"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Mail className="w-5 h-5" />
            Support@gouache.art
          </a>
          <p className="text-sm text-muted-foreground mt-4">
            We typically respond within 24-48 hours
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            {/* Account & Profile */}
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-start gap-4">
                <MessageCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Account & Profile</h3>
                  <div className="space-y-4 text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">How do I create an account?</p>
                      <p>Click "Sign In" and follow the prompts to create your account using email or social login.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">How do I update my profile?</p>
                      <p>Go to Settings → Profile to update your display name, bio, and profile picture.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Uploading Artwork */}
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Image className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Uploading Artwork</h3>
                  <div className="space-y-4 text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">What file formats are supported?</p>
                      <p>We support JPEG, PNG, GIF, WebP for images, and MP4 for videos.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Is there a file size limit?</p>
                      <p>Images can be up to 10MB, and videos up to 500MB.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">How do I add artwork to my portfolio?</p>
                      <p>Upload your artwork and select "Show in Portfolio" to display it on your profile page.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selling Artwork */}
            <div className="bg-card border rounded-lg p-6">
              <div className="flex items-start gap-4">
                <DollarSign className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Selling Artwork</h3>
                  <div className="space-y-4 text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">How do I sell my artwork?</p>
                      <p>Connect your Stripe account in Settings → Business, then mark your artwork as "For Sale" when uploading.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">What are the fees?</p>
                      <p>Gouache is commission-free! We take 0% platform commission on your sales. Only standard Stripe payment processing fees apply (~2.9% + $0.30 per transaction).</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">How do I process refunds?</p>
                      <p>Refunds can be processed through your Business Dashboard or directly via your Stripe account dashboard.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Safety */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Privacy & Safety</h3>
                  <div className="space-y-4 text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">How is my data protected?</p>
                      <p>We use industry-standard encryption and security measures to protect your data. Read our Privacy Policy for details.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">How do I report inappropriate content?</p>
                      <p>Contact us at Support@gouache.art with details about the content in question.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Issues */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <HelpCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Technical Issues</h3>
                  <div className="space-y-4 text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">My video won't play</p>
                      <p>Try refreshing the page. If the issue persists, ensure your browser is up to date and contact support.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">I can't upload my artwork</p>
                      <p>Check your file format and size. If the issue continues, clear your browser cache or try a different browser.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Still Need Help */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-2">Still Need Help?</h2>
          <p className="text-muted-foreground mb-6">
            Can't find what you're looking for? We're happy to assist you personally.
          </p>
          <a
            href="mailto:Support@gouache.art"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Mail className="w-5 h-5" />
            Contact Support
          </a>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            For terms of service, privacy policy, and other information, visit{' '}
            <a href="/" className="text-primary hover:underline">
              gouache.art
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

