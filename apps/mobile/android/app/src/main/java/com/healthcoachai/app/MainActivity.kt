package com.healthcoachai.app

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Set up the main content
        val titleTextView = findViewById<TextView>(R.id.titleTextView)
        val subtitleTextView = findViewById<TextView>(R.id.subtitleTextView)

        titleTextView.text = "HealthCoachAI"
        subtitleTextView.text = "Your AI-Powered Health Coach"
    }
}
