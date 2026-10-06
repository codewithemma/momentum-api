export function FollowUpReminderEmailTemplate({
  dueToday,
  overdue,
  dashboardUrl,
}: {
  dueToday: {
    id: string;
    name: string;
    company: string | null;
  }[];
  overdue: {
    id: string;
    name: string;
    company: string | null;
  }[];
  dashboardUrl: string;
}) {
  const dueTodayHtml = dueToday
    .map(
      (lead) => `
        <tr>
          <td style="padding: 13px 0; border-bottom: 1px solid #2a2a2a; color: #f5f5f5; font-size: 14px; line-height: 20px;">
            <strong style="font-weight: 600;">${lead.name}</strong>
            ${
              lead.company
                ? `<div style="margin-top: 2px; color: #8a8a8a; font-size: 12px; line-height: 18px;">${lead.company}</div>`
                : ''
            }
          </td>
        </tr>
      `,
    )
    .join('');

  const overdueHtml = overdue
    .map(
      (lead) => `
        <tr>
          <td style="padding: 13px 0; border-bottom: 1px solid #2a2a2a; color: #f5f5f5; font-size: 14px; line-height: 20px;">
            <strong style="font-weight: 600;">${lead.name}</strong>
            ${
              lead.company
                ? `<div style="margin-top: 2px; color: #8a8a8a; font-size: 12px; line-height: 18px;">${lead.company}</div>`
                : ''
            }
          </td>
        </tr>
      `,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; background: #0b0b0b; color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background: #0b0b0b;">
          <tr>
            <td style="padding: 32px 16px;">
              <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; border-collapse: collapse; background: #111111; border: 1px solid #2a2a2a;">
                <tr>
                  <td style="padding: 24px 28px 22px; border-bottom: 1px solid #2a2a2a;">
                    <div style="margin-bottom: 20px; color: #8a8a8a; font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase;">
                      Momentum
                    </div>
                    <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 28px;">
                      Follow-up reminders
                    </h1>
                    <p style="margin: 0; color: #999999; font-size: 14px; line-height: 21px;">
                      Here's what needs your attention today.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 24px 28px 28px;">
                    ${
                      dueToday.length > 0
                        ? `
                          <h2 style="margin: 0 0 8px; color: #d4d4d4; font-size: 12px; font-weight: 700; letter-spacing: 0.8px; line-height: 18px; text-transform: uppercase;">
                            Due today <span style="color: #737373;">(${dueToday.length})</span>
                          </h2>

                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            ${dueTodayHtml}
                          </table>
                        `
                        : ''
                    }

                    ${
                      overdue.length > 0
                        ? `
                          <h2 style="margin: ${dueToday.length > 0 ? '28px' : '0'} 0 8px; color: #d4d4d4; font-size: 12px; font-weight: 700; letter-spacing: 0.8px; line-height: 18px; text-transform: uppercase;">
                            Overdue <span style="color: #737373;">(${overdue.length})</span>
                          </h2>

                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            ${overdueHtml}
                          </table>
                        `
                        : ''
                    }

                    <div style="margin-top: 28px;">
                      <a
                        href="${dashboardUrl}"
                        style="display: inline-block; padding: 10px 16px; background: #f5f5f5; color: #111111; text-decoration: none; border: 1px solid #f5f5f5; border-radius: 4px; font-size: 13px; font-weight: 600; line-height: 18px;"
                      >
                        Open Momentum
                      </a>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 16px 28px; border-top: 1px solid #2a2a2a;">
                    <p style="margin: 0; color: #666666; font-size: 11px; line-height: 17px;">
                      You're receiving this because you have follow-ups in Momentum.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
