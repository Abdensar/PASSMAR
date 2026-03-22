// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PassportRegistry
 * @notice Registre on-chain : HMAC hash, statuts, voyages, renouvellements, interdiction de sortie.
 * @dev Aucune donnée personnelle — uniquement empreintes et métadonnées techniques.
 */
contract PassportRegistry {
    address public owner;

    enum Role {
        NONE,
        DOUANE,
        POLICE,
        ADMIN
    }

    enum Statut {
        ACTIF,
        REVOQUE,
        PERDU
    }

    struct Passport {
        string hmacHash;
        Statut statut;
        bool interdictionSortie;
        string raisonRevocation;
        uint256 dateEmission;
        uint256 dateExpiration;
        address ethAgentEmetteur;
        bool renewed; // ancien passeport remplacé par renouvellement
    }

    struct Travel {
        string typeMvt;
        uint256 timestamp;
        address ethAgentSig;
    }

    struct Renewal {
        string hashPrecedent;
        string hashNouveau;
        uint256 dateRenouv;
        address ethAgent;
    }

    mapping(address => Role) public authorizedAgents;
    mapping(string => Passport) private passports;
    mapping(string => Travel[]) private travels;
    mapping(string => Renewal[]) private renewals;

    mapping(string => bool) private passportExists;

    event PassportCreated(
        string hmacHash,
        uint256 dateEmission,
        uint256 dateExpiration,
        address ethAgent
    );
    event TravelAdded(string hmacHash, string typeMvt, uint256 timestamp, address ethAgent);
    event PassportRevoked(string hmacHash, string raison);
    event TravelBanUpdated(string hmacHash, bool banned);
    event PassportRenewed(string oldHash, string newHash, uint256 newExpiration);
    event AgentAuthorized(address indexed agent, Role role);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyDouane() {
        require(
            authorizedAgents[msg.sender] == Role.DOUANE ||
                authorizedAgents[msg.sender] == Role.ADMIN,
            "NOT_DOUANE"
        );
        _;
    }

    modifier onlyAdmin() {
        require(authorizedAgents[msg.sender] == Role.ADMIN, "NOT_ADMIN");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedAgents[msg.sender] = Role.ADMIN;
    }

    function addAuthorizedAgent(address agent, Role role) external onlyAdmin {
        require(agent != address(0), "ZERO_ADDR");
        require(role != Role.NONE, "INVALID_ROLE");
        authorizedAgents[agent] = role;
        emit AgentAuthorized(agent, role);
    }

    function createPassport(
        string calldata hmacHash,
        uint256 dateEmission,
        uint256 dateExpiration,
        address ethAgentEmetteur
    ) external onlyDouane {
        require(bytes(hmacHash).length > 0, "EMPTY_HASH");
        require(!passportExists[hmacHash], "PASSPORT_EXISTS");
        require(dateExpiration > dateEmission, "BAD_DATES");
        require(ethAgentEmetteur != address(0), "ZERO_AGENT");

        passports[hmacHash] = Passport({
            hmacHash: hmacHash,
            statut: Statut.ACTIF,
            interdictionSortie: false,
            raisonRevocation: "",
            dateEmission: dateEmission,
            dateExpiration: dateExpiration,
            ethAgentEmetteur: ethAgentEmetteur,
            renewed: false
        });
        passportExists[hmacHash] = true;
        emit PassportCreated(hmacHash, dateEmission, dateExpiration, ethAgentEmetteur);
    }

    /// @notice Statut effectif : EXPIRE si block.timestamp > dateExpiration ou renouvelé.
    function getStatutEffectif(string calldata hmacHash) public view returns (string memory) {
        require(passportExists[hmacHash], "NOT_FOUND");
        Passport storage p = passports[hmacHash];
        if (p.renewed) {
            return "EXPIRE";
        }
        if (block.timestamp > p.dateExpiration) {
            return "EXPIRE";
        }
        if (p.statut == Statut.REVOQUE) {
            return "REVOQUE";
        }
        if (p.statut == Statut.PERDU) {
            return "PERDU";
        }
        return "ACTIF";
    }

    function getPassport(string calldata hmacHash)
        external
        view
        returns (
            string memory hmacHashOut,
            uint8 statutBrut,
            bool interdictionSortie,
            string memory raisonRevocation,
            uint256 dateEmission,
            uint256 dateExpiration,
            address ethAgentEmetteur,
            bool renewed,
            string memory statutEffectif
        )
    {
        require(passportExists[hmacHash], "NOT_FOUND");
        Passport storage p = passports[hmacHash];
        return (
            p.hmacHash,
            uint8(p.statut),
            p.interdictionSortie,
            p.raisonRevocation,
            p.dateEmission,
            p.dateExpiration,
            p.ethAgentEmetteur,
            p.renewed,
            getStatutEffectif(hmacHash)
        );
    }

    function addTravel(
        string calldata hmacHash,
        string calldata typeMvt,
        uint256 timestamp,
        address ethAgentSig
    ) external onlyDouane {
        require(passportExists[hmacHash], "NOT_FOUND");
        Passport storage p = passports[hmacHash];
        require(!p.renewed, "PASSPORT_RENEWED");
        require(p.statut == Statut.ACTIF, "INVALID_STATUT");
        require(block.timestamp <= p.dateExpiration, "PASSPORT_EXPIRED");
        bytes32 t = keccak256(bytes(typeMvt));
        require(t == keccak256(bytes("ENT")) || t == keccak256(bytes("SOR")), "BAD_MOVT");
        if (t == keccak256(bytes("SOR"))) {
            require(!p.interdictionSortie, "TRAVEL_BAN");
        }
        require(ethAgentSig != address(0), "ZERO_AGENT");

        travels[hmacHash].push(
            Travel({typeMvt: typeMvt, timestamp: timestamp, ethAgentSig: ethAgentSig})
        );
        emit TravelAdded(hmacHash, typeMvt, timestamp, ethAgentSig);
    }

    function getTravelHistory(string calldata hmacHash) external view returns (Travel[] memory) {
        require(passportExists[hmacHash], "NOT_FOUND");
        return travels[hmacHash];
    }

    function confirmRevocation(string calldata hmacHash, string calldata raison) external onlyAdmin {
        require(passportExists[hmacHash], "NOT_FOUND");
        Passport storage p = passports[hmacHash];
        require(p.statut == Statut.ACTIF || p.statut == Statut.PERDU, "ALREADY_REVOKED");
        require(bytes(raison).length > 0, "EMPTY_RAISON");
        p.statut = Statut.REVOQUE;
        p.raisonRevocation = raison;
        emit PassportRevoked(hmacHash, raison);
    }

    function setTravelBan(string calldata hmacHash, bool banned) external onlyAdmin {
        require(passportExists[hmacHash], "NOT_FOUND");
        passports[hmacHash].interdictionSortie = banned;
        emit TravelBanUpdated(hmacHash, banned);
    }

    function renewPassport(
        string calldata oldHash,
        string calldata newHash,
        uint256 newDateEmission,
        uint256 newDateExpiration,
        address ethAgent
    ) external onlyDouane {
        require(bytes(newHash).length > 0, "EMPTY_NEW_HASH");
        require(!passportExists[newHash], "NEW_HASH_EXISTS");
        require(passportExists[oldHash], "OLD_NOT_FOUND");
        Passport storage oldP = passports[oldHash];
        require(!oldP.renewed, "ALREADY_RENEWED");
        require(oldP.statut == Statut.ACTIF, "OLD_NOT_ACTIF");
        require(block.timestamp <= oldP.dateExpiration, "OLD_EXPIRED");
        require(newDateExpiration > newDateEmission, "BAD_NEW_DATES");
        require(ethAgent != address(0), "ZERO_AGENT");

        oldP.renewed = true;

        passports[newHash] = Passport({
            hmacHash: newHash,
            statut: Statut.ACTIF,
            interdictionSortie: oldP.interdictionSortie,
            raisonRevocation: "",
            dateEmission: newDateEmission,
            dateExpiration: newDateExpiration,
            ethAgentEmetteur: ethAgent,
            renewed: false
        });
        passportExists[newHash] = true;

        renewals[oldHash].push(
            Renewal({
                hashPrecedent: oldHash,
                hashNouveau: newHash,
                dateRenouv: block.timestamp,
                ethAgent: ethAgent
            })
        );
        emit PassportRenewed(oldHash, newHash, newDateExpiration);
    }

    function getRenewals(string calldata oldHash) external view returns (Renewal[] memory) {
        return renewals[oldHash];
    }

    function exists(string calldata hmacHash) external view returns (bool) {
        return passportExists[hmacHash];
    }
}
