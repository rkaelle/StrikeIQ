import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authStore: AuthStore
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var showSignup = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color("AppBackground")
                    .ignoresSafeArea()

                VStack(spacing: 24) {
                    // Logo
                    VStack(spacing: 8) {
                        Text("StrikeIQ")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        Text("Sign in to your account")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.bottom, 32)

                    // Form
                    VStack(spacing: 16) {
                        // Error message
                        if let error = authStore.error {
                            HStack {
                                Image(systemName: "exclamationmark.circle.fill")
                                Text(error)
                            }
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                        }

                        // Email
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Email")
                                .font(.caption)
                                .foregroundColor(.gray)

                            HStack {
                                Image(systemName: "envelope")
                                    .foregroundColor(.gray)
                                TextField("you@example.com", text: $email)
                                    .textContentType(.emailAddress)
                                    .autocapitalization(.none)
                            }
                            .padding()
                            .background(Color("AppBackground"))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                        }

                        // Password
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password")
                                .font(.caption)
                                .foregroundColor(.gray)

                            HStack {
                                Image(systemName: "lock")
                                    .foregroundColor(.gray)

                                if showPassword {
                                    TextField("Password", text: $password)
                                } else {
                                    SecureField("Password", text: $password)
                                }

                                Button(action: { showPassword.toggle() }) {
                                    Image(systemName: showPassword ? "eye.slash" : "eye")
                                        .foregroundColor(.gray)
                                }
                            }
                            .padding()
                            .background(Color("AppBackground"))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                        }

                        // Sign In Button
                        Button(action: {
                            authStore.login(email: email, password: password)
                        }) {
                            if authStore.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .black))
                            } else {
                                Text("Sign In")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color("AppPrimary"))
                        .foregroundColor(.black)
                        .cornerRadius(8)
                        .disabled(authStore.isLoading || email.isEmpty || password.isEmpty)
                    }
                    .padding()
                    .background(Color("AppSurface"))
                    .cornerRadius(12)

                    // Sign Up Link
                    HStack {
                        Text("Don't have an account?")
                            .foregroundColor(.gray)

                        Button("Sign up") {
                            showSignup = true
                        }
                        .foregroundColor(Color("AppPrimary"))
                    }
                    .font(.subheadline)
                }
                .padding()
            }
            .navigationDestination(isPresented: $showSignup) {
                SignupView()
            }
        }
    }
}

struct SignupView: View {
    @EnvironmentObject var authStore: AuthStore
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showPassword = false

    var body: some View {
        ZStack {
            Color("AppBackground")
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Text("Create Account")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        Text("Start tracking your options performance")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.top, 32)

                    // Form
                    VStack(spacing: 16) {
                        // Error message
                        if let error = authStore.error {
                            HStack {
                                Image(systemName: "exclamationmark.circle.fill")
                                Text(error)
                            }
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                        }

                        // Name
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Name")
                                .font(.caption)
                                .foregroundColor(.gray)

                            HStack {
                                Image(systemName: "person")
                                    .foregroundColor(.gray)
                                TextField("John Doe", text: $name)
                            }
                            .padding()
                            .background(Color("AppBackground"))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                        }

                        // Email
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Email")
                                .font(.caption)
                                .foregroundColor(.gray)

                            HStack {
                                Image(systemName: "envelope")
                                    .foregroundColor(.gray)
                                TextField("you@example.com", text: $email)
                                    .textContentType(.emailAddress)
                                    .autocapitalization(.none)
                            }
                            .padding()
                            .background(Color("AppBackground"))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                        }

                        // Password
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password")
                                .font(.caption)
                                .foregroundColor(.gray)

                            HStack {
                                Image(systemName: "lock")
                                    .foregroundColor(.gray)

                                if showPassword {
                                    TextField("Password", text: $password)
                                } else {
                                    SecureField("Password", text: $password)
                                }

                                Button(action: { showPassword.toggle() }) {
                                    Image(systemName: showPassword ? "eye.slash" : "eye")
                                        .foregroundColor(.gray)
                                }
                            }
                            .padding()
                            .background(Color("AppBackground"))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                        }

                        // Confirm Password
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Confirm Password")
                                .font(.caption)
                                .foregroundColor(.gray)

                            HStack {
                                Image(systemName: "lock")
                                    .foregroundColor(.gray)
                                SecureField("Confirm password", text: $confirmPassword)
                            }
                            .padding()
                            .background(Color("AppBackground"))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                        }

                        // Sign Up Button
                        Button(action: {
                            if password == confirmPassword {
                                authStore.register(email: email, password: password, name: name)
                            } else {
                                authStore.error = "Passwords do not match"
                            }
                        }) {
                            if authStore.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .black))
                            } else {
                                Text("Create Account")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color("AppPrimary"))
                        .foregroundColor(.black)
                        .cornerRadius(8)
                        .disabled(authStore.isLoading || email.isEmpty || password.isEmpty)
                    }
                    .padding()
                    .background(Color("AppSurface"))
                    .cornerRadius(12)

                    // Sign In Link
                    HStack {
                        Text("Already have an account?")
                            .foregroundColor(.gray)

                        Button("Sign in") {
                            dismiss()
                        }
                        .foregroundColor(Color("AppPrimary"))
                    }
                    .font(.subheadline)
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}
