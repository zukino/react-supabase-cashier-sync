flowchart TD
    A[Launch App]
    B[Initialize Local DB]
    C{Is Online}
    D[Load UI]
    E[Start Sync Timer every 5 minutes]
    F[Fetch Remote Updates]
    G[Push Local Changes]
    H[Update Local DB]
    I[Sync Success]
    J[Sync Failure]
    K[Show Offline Mode]
    L[Transaction Input]
    M[Save Transaction to Local DB]
    N[Inventory Management]

    A --> B
    B --> C
    C -->|Yes| D
    C -->|No| K
    K --> D

    D --> E
    E --> F
    F --> H
    H --> G
    G --> I
    G --> J
    I --> E
    J --> E

    D --> L
    D --> N
    L --> M
    N --> M
    M --> D