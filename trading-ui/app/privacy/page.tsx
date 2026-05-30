import Link from "next/link";

export default function PrivacyPolicyPage() {
    return (
        <main className="sw-legal">
            <article>
                <div className="space-y-8">
                    <div className="mb-8">
                        <Link
                            href="/"
                            className="sw-button-secondary w-fit"
                        >
                            Back to home
                        </Link>
                    </div>

                    <h1>Privacy Policy</h1>
                    <p>
                        Last Updated: November 1, 2025
                    </p>

                    <div>
                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
                            <p className="text-slate-700 mb-4">
                                StockWin (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
                            </p>
                            <p className="text-slate-700 mb-4">
                                By using StockWin, you agree to the collection and use of information in accordance with this policy.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Information We Collect</h2>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2.1 Personal Information</h3>
                            <p className="text-slate-700 mb-4">
                                When you create an account, we collect:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>Email address</li>
                                <li>Name (if provided through OAuth)</li>
                                <li>Profile information from third-party authentication providers (e.g., Google)</li>
                                <li>Password (encrypted and never stored in plain text)</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2.2 Usage Data</h3>
                            <p className="text-slate-700 mb-4">
                                We automatically collect information about how you use our Service:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>Login timestamps and session duration</li>
                                <li>Predictions viewed and interaction history</li>
                                <li>Browser type, device information, and IP address</li>
                                <li>Pages visited and features used</li>
                                <li>Error logs and performance data</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2.3 Payment Information</h3>
                            <p className="text-slate-700 mb-4">
                                For paid subscriptions, payment information is processed by our third-party payment processor (Stripe). We do not store your complete credit card information on our servers. We only retain:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>Last 4 digits of your card</li>
                                <li>Card brand (Visa, Mastercard, etc.)</li>
                                <li>Billing history and transaction records</li>
                                <li>Subscription status and renewal dates</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2.4 Cookies and Tracking Technologies</h3>
                            <p className="text-slate-700 mb-4">
                                We use cookies and similar technologies to:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>Maintain your login session</li>
                                <li>Remember your preferences</li>
                                <li>Analyze usage patterns and improve our Service</li>
                                <li>Provide personalized content</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. How We Use Your Information</h2>
                            <p className="text-slate-700 mb-4">
                                We use the collected information for:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li><strong>Service Delivery:</strong> Provide AI-powered predictions and personalized portfolio insights</li>
                                <li><strong>Account Management:</strong> Create and maintain your account, process subscriptions</li>
                                <li><strong>Communication:</strong> Send important updates, subscription notifications, and security alerts</li>
                                <li><strong>Improvement:</strong> Analyze usage patterns to improve our AI models and user experience</li>
                                <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
                                <li><strong>Compliance:</strong> Meet legal and regulatory obligations</li>
                                <li><strong>Marketing:</strong> Send promotional emails (you can opt-out at any time)</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Data Sharing and Disclosure</h2>
                            <p className="text-slate-700 mb-4">
                                We do not sell your personal information. We may share your data with:
                            </p>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">4.1 Service Providers</h3>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li><strong>Supabase:</strong> Authentication and database services</li>
                                <li><strong>Stripe:</strong> Payment processing</li>
                                <li><strong>Vercel:</strong> Hosting and infrastructure</li>
                                <li><strong>Analytics Providers:</strong> Usage analytics and monitoring</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">4.2 Legal Requirements</h3>
                            <p className="text-slate-700 mb-4">
                                We may disclose your information if required by law or in response to:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>Legal process or government requests</li>
                                <li>Court orders or subpoenas</li>
                                <li>Protection of our rights, privacy, safety, or property</li>
                                <li>Investigation of fraud or security issues</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">4.3 Business Transfers</h3>
                            <p className="text-slate-700 mb-4">
                                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Data Security</h2>
                            <p className="text-slate-700 mb-4">
                                We implement industry-standard security measures to protect your data:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                                <li>Secure authentication with hashed passwords</li>
                                <li>Regular security audits and vulnerability assessments</li>
                                <li>Access controls and role-based permissions</li>
                                <li>Automated backups and disaster recovery procedures</li>
                            </ul>
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                                <p className="text-slate-700">
                                    <strong>Note:</strong> While we strive to protect your information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
                                </p>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Data Retention</h2>
                            <p className="text-slate-700 mb-4">
                                We retain your personal information for as long as:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>Your account is active</li>
                                <li>Needed to provide the Service</li>
                                <li>Required for legal, tax, or regulatory purposes</li>
                                <li>Necessary to resolve disputes or enforce agreements</li>
                            </ul>
                            <p className="text-slate-700 mb-4">
                                When you delete your account, we will delete or anonymize your personal data within 90 days, except where retention is required by law.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Your Rights and Choices</h2>
                            <p className="text-slate-700 mb-4">
                                Depending on your location, you may have the following rights:
                            </p>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">7.1 Access and Portability</h3>
                            <p className="text-slate-700 mb-4">
                                Request a copy of your personal data in a portable format
                            </p>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">7.2 Correction</h3>
                            <p className="text-slate-700 mb-4">
                                Update or correct inaccurate information in your account settings
                            </p>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">7.3 Deletion</h3>
                            <p className="text-slate-700 mb-4">
                                Request deletion of your account and personal data (subject to legal retention requirements)
                            </p>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">7.4 Opt-Out</h3>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>Unsubscribe from marketing emails using the link in each email</li>
                                <li>Disable cookies through your browser settings (may affect functionality)</li>
                                <li>Opt-out of analytics tracking</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">7.5 Restriction and Objection</h3>
                            <p className="text-slate-700 mb-4">
                                Request restriction of processing or object to certain data uses
                            </p>

                            <p className="text-slate-700 mb-4 mt-6">
                                To exercise these rights, contact us at stockwin.win@proton.me
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. International Data Transfers</h2>
                            <p className="text-slate-700 mb-4">
                                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Children&apos;s Privacy</h2>
                            <p className="text-slate-700 mb-4">
                                Our Service is not intended for users under 18 years of age. We do not knowingly collect information from children. If you believe we have inadvertently collected information from a child, please contact us immediately.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Third-Party Links</h2>
                            <p className="text-slate-700 mb-4">
                                Our Service may contain links to third-party websites. We are not responsible for the privacy practices of these sites. We encourage you to review their privacy policies.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Changes to This Policy</h2>
                            <p className="text-slate-700 mb-4">
                                We may update this Privacy Policy from time to time. We will notify you of material changes by:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>Email notification</li>
                                <li>Prominent notice on our Service</li>
                                <li>Updating the &quot;Last Updated&quot; date</li>
                            </ul>
                            <p className="text-slate-700 mb-4">
                                Your continued use of the Service after changes constitutes acceptance of the updated policy.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">12. Contact Us</h2>
                            <p className="text-slate-700 mb-4">
                                If you have questions about this Privacy Policy or our data practices, please contact us:
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-slate-700">
                                    <strong>Email:</strong> stockwin.win@proton.me<br />
                                    <strong>Website:</strong> www.stockwin.win<br />
                                </p>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4">13. Regulatory Compliance</h2>
                            <p className="text-slate-700 mb-4">
                                We comply with applicable data protection regulations, including:
                            </p>
                            <ul className="list-disc pl-6 text-slate-700 mb-4 space-y-2">
                                <li>General Data Protection Regulation (GDPR) for EU users</li>
                                <li>California Consumer Privacy Act (CCPA) for California residents</li>
                                <li>Other applicable state and federal privacy laws</li>
                            </ul>
                        </section>
                    </div>
                </div>
            </article>
        </main>
    );
}
