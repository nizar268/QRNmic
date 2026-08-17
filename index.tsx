/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, isSupabaseConfigured, SUPABASE_URL } from './supabaseClient';

const editIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-4-4zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/></svg>`;
const deleteIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1-1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 1 1 0v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/></svg>`;

// Declare global variable from CDN script
declare var QRCodeStyling: any;

// ===== Admin Email Whitelist (kecualikan daripada semakan allowlist) =====
const ADMIN_EMAILS = ['m.nizar@umt.edu.my'];
const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

// ===== Types =====
interface QREntry {
    id: string;
    name: string;
    targetUrl: string;
    ownerId?: string;
    createdAt?: string;
}

const QR_CAPACITIES = {
    L: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
    M: [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1208, 1268, 1368, 1452, 1540, 1632, 1728, 1813, 1911, 1987, 2099, 2215, 2335],
    Q: [11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 988, 1032, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
    H: [7, 14, 24, 34, 44, 58, 66, 84, 100, 118, 138, 158, 180, 197, 224, 250, 280, 310, 338, 382, 403, 439, 463, 511, 535, 583, 625, 658, 698, 742, 782, 826, 874, 908, 963, 1021, 1053, 1117, 1185, 1257]
};

interface QrMetadata {
    chosen_version: number;
    module_count: number;
    ecc: 'L' | 'M' | 'Q' | 'H';
    byte_len: number;
    module_size_px: number;
    final_width_px: number;
    warning?: string;
}

function calculateQrMetadata(data: string, ecc: 'L' | 'M' | 'Q' | 'H'): QrMetadata | null {
    if (!data) return null;
    try {
        const byte_len = new Blob([data]).size;
        const capacityList = QR_CAPACITIES[ecc];
        let chosen_version = -1;
        for (let i = 0; i < capacityList.length; i++) {
            if (capacityList[i] >= byte_len) {
                chosen_version = i + 1;
                break;
            }
        }
        if (chosen_version === -1) {
            return {
                warning: "URL terlalu panjang untuk dijana sebagai Kod QR. Sila gunakan pemendek URL seperti bit.ly untuk memendekkan pautan anda.",
                byte_len,
                ecc,
                chosen_version: 0, module_count: 0, module_size_px: 0, final_width_px: 0,
            };
        }
        const module_count = 21 + 4 * (chosen_version - 1);
        let target_width_px = 1024;
        let module_size_px = Math.floor(target_width_px / (module_count + 8));
        if (module_size_px < 3) module_size_px = 3;
        const final_width_px = (module_count + 8) * module_size_px;
        let warning;
        if (chosen_version > 32) {
             warning = "URL sangat panjang. Pertimbangkan untuk memendekkannya untuk kebolehimbasan yang lebih baik.";
        }
        return {
            chosen_version,
            module_count,
            ecc,
            byte_len,
            module_size_px,
            final_width_px,
            warning,
        };
    } catch (e) {
        console.error("Error calculating QR metadata:", e);
        return null;
    }
}

// ===== Helper Functions =====
function mapSupabaseAuthError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
        return 'E-mel atau kata laluan tidak sah.';
    }
    if (lower.includes('already registered') || lower.includes('user already exists')) {
        return 'E-mel ini telah didaftarkan.';
    }
    if (lower.includes('password should be at least') || lower.includes('weak password')) {
        return 'Kata laluan terlalu lemah. Sila gunakan sekurang-kurangnya 6 aksara.';
    }
    if (lower.includes('email not confirmed')) {
        return 'Sila sahkan e-mel anda melalui pautan pengesahan yang dihantar.';
    }
    if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
        return 'Format e-mel tidak sah.';
    }
    return message || 'Berlaku ralat semasa pengesahan. Sila cuba lagi.';
}

function formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    try {
        const date = typeof timestamp === 'string' ? new Date(timestamp) : (typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp));
        if (isNaN(date.getTime())) return '';
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        };
        return new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', '');
    } catch (error) {
        console.error("Error formatting timestamp:", error);
        return '';
    }
}

// ===== Components =====
function AuthPage() {
    const [isLogin, setIsLogin] = React.useState(true);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [infoMessage, setInfoMessage] = React.useState<string | null>(null);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Sila masukkan e-mel dan kata laluan.");
            return;
        }
        if (!isLogin && password !== confirmPassword) {
            setError("Kata laluan dan pengesahan kata laluan tidak sepadan.");
            return;
        }

        setError(null);
        setInfoMessage(null);
        setIsLoading(true);

        try {
            const emailToCheck = email.trim().toLowerCase();

            // ===== SEMAKAN SENARAI ALLOWLIST (Kecualikan akaun Admin) =====
            if (!isAdminEmail(emailToCheck)) {
                try {
                    const { data: allowedEmailDoc, error: allowlistErr } = await supabase
                        .from('allowed_emails')
                        .select('email')
                        .eq('email', emailToCheck)
                        .maybeSingle();

                    if (allowlistErr) {
                        console.error("Error checking email allowlist:", allowlistErr);
                        setError("Ralat sambungan: Semak sambungan Supabase anda.");
                        setIsLoading(false);
                        return;
                    }

                    if (!allowedEmailDoc) {
                        if (isLogin) {
                            setError("Akaun anda telah disekat. Sila hubungi pentadbir.");
                        } else {
                            setError("E-mel ini tidak dibenarkan untuk mendaftar. Sila hubungi pentadbir.");
                        }
                        setIsLoading(false);
                        return;
                    }
                } catch (err: any) {
                    console.error("Error checking email allowlist:", err);
                    setError("Ralat pangkalan data semasa menyemak e-mel.");
                    setIsLoading(false);
                    return;
                }
            }

            // Jika semakan melepasi, teruskan dengan Supabase Auth
            if (isLogin) {
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email: emailToCheck,
                    password: password
                });
                if (loginError) throw loginError;
            } else {
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: emailToCheck,
                    password: password
                });
                if (signUpError) throw signUpError;

                if (signUpData?.user && !signUpData.session) {
                    setInfoMessage("Pendaftaran berjaya! Sila semak peti masuk e-mel anda untuk mengesahkan akaun.");
                }
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            setError(mapSupabaseAuthError(err.message || ''));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError(null);
        setInfoMessage(null);
        setPassword('');
        setConfirmPassword('');
    };

    return React.createElement('div', { className: 'auth-container' },
        React.createElement('h1', {}, ['Penjana', React.createElement('br',{}), 'Kod QR Dinamik']),
        React.createElement('div', { className: 'auth-box' },
            React.createElement('h2', {}, isLogin ? 'Log Masuk' : 'Daftar Akaun Baru'),
            React.createElement('p', { className: 'auth-subtitle' }, isLogin ? 'Selamat kembali! Sila log masuk ke akaun anda.' : 'Cipta akaun untuk mula menyimpan Kod QR anda.'),
            React.createElement('form', { className: 'auth-form', onSubmit: handleSubmit },
                error && React.createElement('p', { className: 'error-text auth-error' }, error),
                infoMessage && React.createElement('p', { className: 'info-text', style: { color: '#00d26a', marginBottom: '1rem', fontSize: '0.9rem' } }, infoMessage),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'email' }, 'E-mel:'),
                    React.createElement('input', { type: 'email', id: 'email', value: email, placeholder: 'anda@contoh.com', onChange: (e: any) => setEmail((e.target as HTMLInputElement).value), required: true })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'password' }, 'Kata Laluan:'),
                    React.createElement('input', { type: 'password', id: 'password', value: password, placeholder: '••••••••', onChange: (e: any) => setPassword((e.target as HTMLInputElement).value), required: true })
                ),
                !isLogin && React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'confirm-password' }, 'Sahkan Kata Laluan:'),
                    React.createElement('input', { type: 'password', id: 'confirm-password', value: confirmPassword, placeholder: '••••••••', onChange: (e: any) => setConfirmPassword((e.target as HTMLInputElement).value), required: true })
                ),
                React.createElement('button', { type: 'submit', className: 'button primary auth-button', disabled: isLoading }, isLoading ? 'MEMPROSES...' : (isLogin ? 'LOG MASUK' : 'DAFTAR')),
                React.createElement('button', { type: 'button', className: 'button-link', onClick: toggleMode },
                    isLogin ? 'Tiada akaun? Daftar di sini.' : 'Sudah ada akaun? Log masuk.'
                )
            )
        )
    );
}

const qrStyleOptions = {
    1: { // Standard Square
        dotsOptions: { type: 'square', color: '#000000' },
        cornersSquareOptions: { type: 'square', color: '#000000' },
        cornersDotOptions: { type: 'square', color: '#000000' }
    },
    2: { // Original Rounded Style
        dotsOptions: { type: 'rounded', color: '#000000' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
        cornersDotOptions: { type: 'dot', color: '#000000' }
    },
    3: { // Classy Rounded with Ring Corners
        dotsOptions: { type: 'classy-rounded', color: '#000000' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
        cornersDotOptions: { type: 'square', color: '#000000' }
    },
    4: { // Approximation of detached corners
        dotsOptions: { type: 'rounded', color: '#000000' },
        cornersSquareOptions: { type: 'square', color: '#000000' },
        cornersDotOptions: { type: 'dot', color: '#000000' }
    },
    5: { // All Dots with Ring Corners
        dotsOptions: { type: 'dots', color: '#000000' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
        cornersDotOptions: { type: 'dot', color: '#000000' }
    }
};

function AdminPage({ onBack }: { onBack: () => void }) {
    const [allowedEmails, setAllowedEmails] = React.useState<{id: string, email: string}[]>([]);
    const [newEmail, setNewEmail] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const fetchAllowedEmails = async () => {
        setIsLoading(true);
        try {
            const { data, error: fetchErr } = await supabase
                .from('allowed_emails')
                .select('email')
                .order('email', { ascending: true });

            if (fetchErr) throw fetchErr;

            const list = (data || []).map((item: any) => ({
                id: item.email,
                email: item.email
            }));
            setAllowedEmails(list);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching allowed emails:", err);
            setError(`Gagal memuatkan senarai e-mel: ${err.message || 'Sila semak kebenaran RLS Supabase anda.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAllowedEmails();
    }, []);

    const handleAddEmail = async (e: any) => {
        e.preventDefault();
        const emailToAdd = newEmail.trim().toLowerCase();
        if (!emailToAdd) {
            setError("Sila masukkan alamat e-mel.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToAdd)) {
            setError("Format e-mel tidak sah.");
            return;
        }
        if (allowedEmails.some(item => item.email === emailToAdd)) {
            setError("E-mel ini sudah wujud dalam senarai.");
            return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
            const { error: insertErr } = await supabase
                .from('allowed_emails')
                .insert({ email: emailToAdd });

            if (insertErr) throw insertErr;

            setNewEmail('');
            await fetchAllowedEmails();
        } catch (err: any) {
            console.error("Error adding email:", err);
            setError(`Gagal menambah e-mel: ${err.message || 'Sila semak kebenaran RLS Supabase.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEmail = async (emailToDelete: string) => {
        if (confirm("Adakah anda pasti mahu memadam e-mel ini daripada senarai yang dibenarkan? Pengguna sedia ada dengan e-mel ini akan disekat daripada log masuk.")) {
            setError(null);
            setIsSubmitting(true);
            try {
                const { error: delErr } = await supabase
                    .from('allowed_emails')
                    .delete()
                    .eq('email', emailToDelete);

                if (delErr) throw delErr;

                await fetchAllowedEmails();
            } catch (err: any) {
                console.error("Error deleting email:", err);
                setError(`Gagal memadam e-mel: ${err.message || 'Sila semak kebenaran RLS Supabase.'}`);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return React.createElement('div', { className: 'admin-container' },
        React.createElement('div', { className: 'admin-pane' },
            React.createElement('div', { className: 'admin-header' },
                React.createElement('h2', {}, 'Kawalan E-mel Pendaftaran (Supabase)'),
                React.createElement('button', { className: 'button', onClick: onBack, title: 'Kembali ke Aplikasi Utama' }, 'Kembali')
            ),
            React.createElement('p', { className: 'admin-subtitle' }, 'Urus senarai e-mel yang dibenarkan untuk mendaftar dan menggunakan aplikasi ini.'),
            React.createElement('form', { className: 'add-email-form', onSubmit: handleAddEmail },
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'newEmail' }, 'Tambah E-mel Baru:'),
                    React.createElement('input', {
                        type: 'email',
                        id: 'newEmail',
                        value: newEmail,
                        placeholder: 'pengguna@contoh.com',
                        onChange: (e: any) => setNewEmail((e.target as HTMLInputElement).value),
                        required: true
                    })
                ),
                React.createElement('button', { type: 'submit', className: 'button primary', disabled: isSubmitting }, isSubmitting ? 'Memproses...' : 'Tambah')
            ),
            error && React.createElement('p', { className: 'error-text', style: { whiteSpace: 'pre-wrap', textAlign: 'left' } }, error),
            React.createElement('div', { className: 'email-list-container' },
                React.createElement('h3', {}, 'Senarai E-mel Dibenarkan'),
                isLoading
                    ? React.createElement('p', {}, 'Memuatkan senarai e-mel...')
                    : allowedEmails.length === 0
                        ? React.createElement('p', { className: 'empty-list-text' }, 'Tiada e-mel yang dibenarkan lagi. Semua pendaftaran disekat.')
                        : React.createElement('ul', { className: 'saved-qr-list' },
                            ...allowedEmails.map(item =>
                                React.createElement('li', { key: item.id, className: 'saved-qr-item' },
                                    React.createElement('span', { className: 'email-list-item-text' }, item.email),
                                    React.createElement('button', {
                                        className: 'button icon-button delete-button',
                                        onClick: () => handleDeleteEmail(item.id),
                                        disabled: isSubmitting,
                                        title: `Padam ${item.email}`,
                                        dangerouslySetInnerHTML: { __html: deleteIconSvg }
                                    })
                                )
                            )
                        )
            )
        )
    );
}

function QrApp({ user, onLogout }: { user: any, onLogout: () => void }) {
    const [view, setView] = React.useState<'main' | 'admin'>('main');
    const [qrName, setQrName] = React.useState('');
    const [targetUrl, setTargetUrl] = React.useState('');
    const [qrEntries, setQrEntries] = React.useState<QREntry[]>([]);
    const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
    const [generatedQrImageUrl, setGeneratedQrImageUrl] = React.useState<string | null>(null);
    const [qrDataThatGeneratedCurrentImage, setQrDataThatGeneratedCurrentImage] = React.useState<string | null>(null);
    const [qrStyle, setQrStyle] = React.useState<number>(1);
    const [qrMetadata, setQrMetadata] = React.useState<QrMetadata | null>(null);

    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const currentAppUrlRef = React.useRef<string>('');

    const constructQrData = (id: string) => `${currentAppUrlRef.current}#qrId=${id}`;

    const getHostnameFromUrl = (url: string): string => {
        if (!url) return '';
        try {
            return new URL(url).hostname;
        } catch (e) {
            const withoutProtocol = url.replace(/^https?:\/\//, '');
            const hostname = withoutProtocol.split('/')[0];
            return hostname;
        }
    };

    React.useEffect(() => {
        // Gunakan VITE_APP_URL (URL pengeluaran) supaya QR Code sentiasa menghala ke domain awam
        const envUrl = (import.meta as any).env?.VITE_APP_URL;
        if (envUrl) {
            let prodUrl = envUrl.trim();
            if (!prodUrl.endsWith('/')) prodUrl += '/';
            currentAppUrlRef.current = prodUrl + 'index.html';
        } else {
            let appUrl = window.location.href.split('#')[0];
            if (!appUrl.endsWith('/')) {
                appUrl = appUrl.substring(0, appUrl.lastIndexOf('/') + 1);
            }
            appUrl += 'index.html';
            currentAppUrlRef.current = appUrl;
        }
    }, []);

    const fetchQrs = async () => {
        if (!user) {
            setQrEntries([]);
            return;
        }
        setIsLoading(true);
        try {
            const userEmail = user.email?.toLowerCase() || '';

            // Cari QR milik pengguna berdasarkan owner_id (baru) ATAU owner_email (migrasi Firebase)
            const { data, error: fetchErr } = await supabase
                .from('qrs')
                .select('*')
                .or(`owner_id.eq.${user.id},owner_email.eq.${userEmail}`)
                .order('created_at', { ascending: false });

            if (fetchErr) throw fetchErr;

            // Auto-claim: Kemaskini owner_id bagi QR migrasi yang belum dikemaskini
            const migratedQrs = (data || []).filter((row: any) => row.owner_id !== user.id && row.owner_email === userEmail);
            if (migratedQrs.length > 0) {
                const migratedIds = migratedQrs.map((row: any) => row.id);
                await supabase
                    .from('qrs')
                    .update({ owner_id: user.id })
                    .in('id', migratedIds);
            }

            const mappedList: QREntry[] = (data || []).map((row: any) => ({
                id: row.id,
                name: row.name,
                targetUrl: row.target_url,
                ownerId: user.id,
                createdAt: row.created_at
            }));

            setQrEntries(mappedList);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching QRs:", err);
            setError("Gagal mengambil data dari Supabase. Sila pastikan sambungan internet anda aktif.");
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchQrs();
    }, [user]);

    const displayQRCode = async (data: string) => {
        if (!data) {
            clearQrDisplay();
            setQrMetadata(null);
            return;
        }
        try {
            const ecc: 'L' | 'M' | 'Q' | 'H' = 'L'; // Use Low ECC for smaller modules
            const metadata = calculateQrMetadata(data, ecc);
            setQrMetadata(metadata);
            if (metadata?.warning && metadata.chosen_version === 0) {
                alert(metadata.warning);
                clearQrDisplay();
                return;
            }
            const style = qrStyleOptions[qrStyle as keyof typeof qrStyleOptions];
            const qrCode = new QRCodeStyling({
                width: 200,
                height: 200,
                margin: 0,
                data: data,
                dotsOptions: style.dotsOptions,
                cornersSquareOptions: style.cornersSquareOptions,
                cornersDotOptions: style.cornersDotOptions,
                qrOptions: { errorCorrectionLevel: ecc },
                backgroundOptions: { color: '#ffffff' }
            });
            const blob = await qrCode.getRawData('png');
            if (blob) {
                if (generatedQrImageUrl && generatedQrImageUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(generatedQrImageUrl);
                }
                const imageUrl = URL.createObjectURL(blob);
                setGeneratedQrImageUrl(imageUrl);
                setQrDataThatGeneratedCurrentImage(data);
            }
        } catch (error) {
            console.error("Gagal menjana Kod QR:", error);
            clearQrDisplay();
            alert("Gagal menjana Kod QR.");
        }
    };

    React.useEffect(() => {
        if (qrDataThatGeneratedCurrentImage) {
            displayQRCode(qrDataThatGeneratedCurrentImage);
        }
    }, [qrStyle]);

    const handleGenerateOrUpdate = async () => {
        if (!qrName.trim() || !targetUrl.trim()) {
            alert("Nama Kod QR dan URL Sasaran tidak boleh kosong.");
            return;
        }

        let correctedUrl = targetUrl.trim();
        if (!correctedUrl.startsWith('http://') && !correctedUrl.startsWith('https://')) {
            correctedUrl = `https://${correctedUrl}`;
        }
        try {
            new URL(correctedUrl);
        } catch (_) {
            alert("Format URL Sasaran tidak sah. Sila pastikan ia adalah pautan yang betul.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            if (editingEntryId) {
                const { error: updateErr } = await supabase
                    .from('qrs')
                    .update({
                        name: qrName.trim(),
                        target_url: correctedUrl
                    })
                    .eq('id', editingEntryId);

                if (updateErr) throw updateErr;

                displayQRCode(constructQrData(editingEntryId));
                await fetchQrs();
            } else {
                const { data: newQr, error: insertErr } = await supabase
                    .from('qrs')
                    .insert({
                        name: qrName.trim(),
                        target_url: correctedUrl,
                        owner_id: user.id,
                        owner_email: user.email?.toLowerCase() || ''
                    })
                    .select()
                    .single();

                if (insertErr) throw insertErr;

                displayQRCode(constructQrData(newQr.id));
                clearFormFieldsOnly();
                await fetchQrs();
            }
        } catch (e: any) {
            console.error("Supabase Save Error:", e);
            setError(`Gagal menyimpan data ke Supabase: ${e.message || 'Sila semak konfigurasi pangkalan data.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (entryToEdit: QREntry) => {
        setQrName(entryToEdit.name);
        setTargetUrl(entryToEdit.targetUrl);
        setEditingEntryId(entryToEdit.id);
        displayQRCode(constructQrData(entryToEdit.id));
    };

    const handleDelete = async (idToDelete: string) => {
        if (confirm("Adakah anda pasti mahu memadam Kod QR ini?")) {
            setError(null);
            try {
                const { error: delErr } = await supabase
                    .from('qrs')
                    .delete()
                    .eq('id', idToDelete);

                if (delErr) throw delErr;

                const entryBeingDeleted = qrEntries.find(e => e.id === idToDelete);
                if (editingEntryId === idToDelete) {
                    clearFullFormAndDisplay();
                } else if (entryBeingDeleted && constructQrData(entryBeingDeleted.id) === qrDataThatGeneratedCurrentImage) {
                    clearQrDisplay();
                } else if (qrEntries.length === 1) {
                    clearQrDisplay();
                }
                await fetchQrs();
            } catch(e: any) {
                console.error("Delete Error:", e);
                setError(`Gagal memadam data dari Supabase: ${e.message}`);
            }
        }
    };

    const clearQrDisplay = () => {
        setGeneratedQrImageUrl(null);
        setQrDataThatGeneratedCurrentImage(null);
    };

    const handleDownloadQRCode = () => {
        if (!qrDataThatGeneratedCurrentImage || !qrMetadata || qrMetadata.chosen_version === 0) {
            alert("Tiada Kod QR yang sah untuk dimuat turun.");
            return;
        }
        let filenamePrefix = 'kod_qr';
        let urlHostname = 'destinasi';
        const qrIdMatch = qrDataThatGeneratedCurrentImage.match(/#qrId=([^&]+)/);
        if (qrIdMatch) {
            const id = qrIdMatch[1];
            const entry = qrEntries.find(e => e.id === id);
            if (entry) {
                filenamePrefix = entry.name.trim();
                urlHostname = getHostnameFromUrl(entry.targetUrl);
            }
        } else {
            if (qrName.trim()) {
                filenamePrefix = qrName.trim();
                urlHostname = getHostnameFromUrl(targetUrl.trim());
            }
        }
        const safePrefix = filenamePrefix.replace(/[^a-z0-9_.-]/gi, '_');
        const safeHostname = urlHostname.replace(/[^a-z0-9_.-]/gi, '_');

        try {
            const style = qrStyleOptions[qrStyle as keyof typeof qrStyleOptions];
            const downloadQrSize = 1024;

            const qrCode = new QRCodeStyling({
                width: downloadQrSize,
                height: downloadQrSize,
                margin: 40,
                data: qrDataThatGeneratedCurrentImage,
                dotsOptions: style.dotsOptions,
                cornersSquareOptions: style.cornersSquareOptions,
                cornersDotOptions: style.cornersDotOptions,
                qrOptions: { errorCorrectionLevel: 'L' },
                backgroundOptions: { color: '#ffffff' }
            });
            qrCode.download({
                name: `${safePrefix}_(${safeHostname})`,
                extension: 'png'
            });
        } catch (error) {
            console.error("Gagal menjana Kod QR untuk muat turun:", error);
            alert("Gagal menjana Kod QR resolusi tinggi untuk muat turun.");
        }
    };

    const clearFormFieldsOnly = () => {
        setQrName('');
        setTargetUrl('');
    };

    const clearFullFormAndDisplay = () => {
        clearFormFieldsOnly();
        setEditingEntryId(null);
        clearQrDisplay();
        setQrMetadata(null);
    };

    if (view === 'admin') {
        return React.createElement(AdminPage, { onBack: () => setView('main') });
    }

    return React.createElement('div', { className: 'container' },
        React.createElement('h1', { className: isAdminEmail(user.email) ? 'admin-title' : undefined }, ['Penjana', React.createElement('br',{}), 'Kod QR Dinamik']),
        React.createElement('div', { className: 'app-layout' },
            React.createElement('div', { className: 'editor-pane' },
                React.createElement('h2', {}, editingEntryId ? 'Sunting Kod QR' : 'Jana Kod QR Baru'),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'qrName' }, 'Nama Kod QR:'),
                    React.createElement('input', { type: 'text', id: 'qrName', value: qrName, placeholder: 'Contoh: FesbukKu', onChange: (e: any) => setQrName((e.target as HTMLInputElement).value) })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { htmlFor: 'targetUrl' }, 'Pautan:'),
                    React.createElement('input', { type: 'url', id: 'targetUrl', value: targetUrl, placeholder: 'https://contoh.com/FesbukKu', onChange: (e: any) => setTargetUrl((e.target as HTMLInputElement).value) })
                ),
                React.createElement('div', { className: 'form-actions' },
                    React.createElement('button', { className: 'button primary', onClick: handleGenerateOrUpdate, disabled: isLoading, title: editingEntryId ? 'Simpan perubahan' : 'Jana Kod QR baru' }, isLoading ? 'Memproses...' : (editingEntryId ? 'KEMASKINI' : 'JANA')),
                    React.createElement('button', { className: 'button', onClick: clearFullFormAndDisplay, disabled: isLoading, title: editingEntryId ? 'Batal Suntingan' : 'Set Semula Borang' }, editingEntryId ? 'BATAL' : 'RESET')
                ),
                React.createElement('div', { className: 'qrcode-container' },
                    React.createElement('div', { id: 'qrcode-display-visible', className: 'qrcode-display', 'aria-live': 'polite' },
                        generatedQrImageUrl
                            ? React.createElement('img', { src: generatedQrImageUrl, alt: 'Kod QR yang dijana', style: { maxWidth: '100%', height: 'auto' }})
                            : React.createElement('p', { className: 'placeholder-text'}, 'Kod QR akan dipaparkan di sini')
                    ),
                    React.createElement('div', { className: 'style-selector' },
                        ...[1, 2, 3, 4, 5].map(styleNum =>
                            React.createElement('button', {
                                key: styleNum,
                                className: `style-option ${qrStyle === styleNum ? 'active' : ''}`,
                                onClick: () => setQrStyle(styleNum),
                                title: `Pilih Gaya ${styleNum}`,
                                'aria-label': `Pilih Gaya ${styleNum}`
                            }, styleNum)
                        )
                    )
                ),
                generatedQrImageUrl && React.createElement('button', { className: 'button download-button', onClick: handleDownloadQRCode, disabled: !generatedQrImageUrl }, 'MUAT TURUN')
            ),
            React.createElement('div', { className: 'saved-pane' },
                React.createElement('h2', {}, 'Senarai Kod QR Disimpan'),
                error && React.createElement('p', { className: 'error-text' }, error),
                isLoading && React.createElement('p', {}, 'Memuatkan...'),
                !isLoading && qrEntries.length === 0
                    ? React.createElement('p', { className: 'empty-list-text' }, 'Tiada Kod QR disimpan lagi.')
                    : React.createElement('ul', { className: 'saved-qr-list', 'aria-label': 'Senarai Kod QR yang telah disimpan' },
                        ...qrEntries.map(entry =>
                            React.createElement('li', { key: entry.id, className: 'saved-qr-item', 'aria-labelledby': `qr-name-${entry.id}` },
                                React.createElement('div', { className: 'item-info' },
                                    React.createElement('strong', { id: `qr-name-${entry.id}` }, entry.name),
                                    React.createElement('span', {className: 'target-url-display'}, getHostnameFromUrl(entry.targetUrl)),
                                    entry.createdAt && React.createElement('span', { className: 'timestamp-display' }, formatTimestamp(entry.createdAt))
                                ),
                                React.createElement('div', { className: 'item-actions' },
                                    React.createElement('button', { className: 'button icon-button edit-button', onClick: () => handleEdit(entry), title: `Sunting ${entry.name}`, dangerouslySetInnerHTML: { __html: editIconSvg } }),
                                    React.createElement('button', { className: 'button icon-button delete-button', onClick: () => handleDelete(entry.id), title: `Padam ${entry.name}`, dangerouslySetInnerHTML: { __html: deleteIconSvg } })
                                )
                            )
                        )
                    )
            )
        ),
        React.createElement('div', { className: 'footer-section' },
            React.createElement('button', { className: 'button footer-logout-btn', onClick: onLogout, title: 'Log Keluar' }, 'LOG KELUAR'),
            isAdminEmail(user.email) && React.createElement('button', {
                className: 'button footer-admin-btn',
                onClick: () => setView('admin'),
                title: 'Menu Pentadbir'
            }, 'MENU ADMIN'),
            React.createElement('p', { className: 'copyright-footer' }, '© 2026 NizarSalleh@PKK Ver.2')
        )
    );
}

function App() {
    const [user, setUser] = React.useState<any | null>(null);
    const [authLoading, setAuthLoading] = React.useState(true);
    const [redirectMessage, setRedirectMessage] = React.useState<string>('');

    React.useEffect(() => {
        // Dapatkan sesi terkini dari Supabase
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setAuthLoading(false);
        }).catch(() => {
            setAuthLoading(false);
        });

        // Dengar sebarang perubahan status log masuk / keluar
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setAuthLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    React.useEffect(() => {
        const handleRedirect = async () => {
            const hash = window.location.hash;
            if (hash.startsWith('#qrId=')) {
                const idToRedirect = hash.substring('#qrId='.length);
                
                if (!idToRedirect.trim()) {
                     setRedirectMessage('Pautan rosak: ID tidak dijumpai.');
                     return;
                }

                setRedirectMessage('Mencari URL sasaran...');
                try {
                    const { data, error: qrErr } = await supabase
                        .from('qrs')
                        .select('target_url')
                        .eq('id', idToRedirect)
                        .maybeSingle();

                    if (qrErr) throw qrErr;

                    if (!data) {
                        setRedirectMessage('Kod QR tidak dijumpai. Ia mungkin telah dipadam.');
                        return;
                    }

                    if (!data.target_url) {
                        setRedirectMessage('URL sasaran kosong.');
                        return;
                    }

                    setRedirectMessage(`Mengalihkan ke: ${data.target_url}...`);
                    setTimeout(() => {
                        window.location.href = data.target_url;
                    }, 1500);
                } catch (e: any) {
                    console.error("Redirect Error:", e);
                    setRedirectMessage(`Gagal mengalihkan. ${e.message || 'Sila semak sambungan pangkalan data.'}`);
                }
            }
        };

        handleRedirect();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    if (!isSupabaseConfigured) {
        return React.createElement('div', { className: 'container redirect-notice', style: { maxWidth: '600px' } },
            React.createElement('h1', {}, ['Konfigurasi', React.createElement('br',{}), 'Supabase Diperlukan']),
            React.createElement('div', { style: { background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', lineHeight: '1.6' } },
                React.createElement('p', { style: { color: '#ffbd2e', fontWeight: 'bold', marginBottom: '0.75rem' } }, '⚠️ Projek ini telah dipindahkan ke Supabase.'),
                React.createElement('p', {}, 'Sila tetapkan pembolehubah persekitaran dalam fail ', React.createElement('code', { style: { color: '#00d26a' } }, '.env'), ':'),
                React.createElement('pre', { style: { background: '#111', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.85rem' } },
                    `VITE_SUPABASE_URL=https://your-project-id.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key-here`
                ),
                React.createElement('p', { style: { marginTop: '1rem', fontSize: '0.9rem', color: '#aaa' } },
                    'Dan pastikan anda telah menjalankan skrip ', React.createElement('code', {}, 'supabase_schema.sql'), ' di SQL Editor Supabase.'
                )
            )
        );
    }

    if (redirectMessage) {
        return React.createElement('div', { className: 'container redirect-notice' },
            React.createElement('h1', {}, ['Penjana', React.createElement('br',{}), 'Kod QR Dinamik']),
            React.createElement('p', { style: { color: '#ff6b6b', whiteSpace: 'pre-wrap' } }, redirectMessage)
        );
    }

    if (authLoading) {
        return React.createElement('div', { className: 'container redirect-notice' },
            React.createElement('h1', {}, ['Penjana', React.createElement('br',{}), 'Kod QR Dinamik']),
            React.createElement('p', {}, 'Memuatkan aplikasi...')
        );
    }

    if (!user) {
        return React.createElement(AuthPage, {});
    }

    return React.createElement(QrApp, { user, onLogout: handleLogout, key: user.id });
}

document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('app');
    if (rootElement) {
        const root = createRoot(rootElement);
        root.render(React.createElement(App));
    } else {
        console.error("Elemen root #app tidak dijumpai dalam DOM.");
    }
});