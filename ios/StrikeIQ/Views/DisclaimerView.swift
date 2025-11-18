import SwiftUI

struct DisclaimerView: View {
    @Binding var hasAccepted: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.yellow.opacity(0.2))
                        .frame(width: 60, height: 60)

                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.title)
                        .foregroundColor(.yellow)
                }

                Text("Important Disclaimer")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Please read before using StrikeIQ")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            .padding(.top, 40)
            .padding(.bottom, 24)

            // Content
            ScrollView {
                VStack(spacing: 16) {
                    DisclaimerItem(
                        icon: "shield.fill",
                        iconColor: Color("Primary"),
                        title: "Not Financial Advice",
                        message: "StrikeIQ provides trading signals for educational and informational purposes only. This is NOT financial advice, and you should NOT rely solely on these signals for trading decisions."
                    )

                    DisclaimerItem(
                        icon: "exclamationmark.triangle.fill",
                        iconColor: Color("RiskHigh"),
                        title: "Risk Warning",
                        message: "Options trading involves substantial risk of loss and is not suitable for all investors. You could lose your entire investment. Only trade with capital you can afford to lose."
                    )

                    DisclaimerItem(
                        icon: "info.circle.fill",
                        iconColor: Color("Secondary"),
                        title: "Do Your Own Research",
                        message: "Always conduct your own research and analysis before making any trading decisions. Past performance does not guarantee future results. Consult with a qualified financial advisor before trading."
                    )

                    Text("By tapping \"I Understand & Accept\", you acknowledge that you have read and understood this disclaimer, that you are aware of the risks involved in options trading, and that you will not hold StrikeIQ liable for any losses incurred from using this application.")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.top, 8)
                }
                .padding(.horizontal)
            }

            // Accept Button
            Button {
                hasAccepted = true
            } label: {
                Text("I Understand & Accept")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color("Primary"))
                    .cornerRadius(12)
            }
            .padding()
        }
        .background(Color("Background"))
    }
}

struct DisclaimerItem: View {
    let icon: String
    let iconColor: Color
    let title: String
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(iconColor)
                .font(.title3)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Text(message)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
        .padding()
        .background(Color("Surface"))
        .cornerRadius(12)
    }
}
